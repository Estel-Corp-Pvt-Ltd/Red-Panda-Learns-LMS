import { CERTIFICATE_REQUEST_STATUS, COLLECTION, USER_ROLE } from "@/constants";
import { db } from "@/firebaseConfig";
import { CertificateRequest } from "@/types/certificate-request";
import { CertificateRequestStatus } from "@/types/general";
import { LearningProgress } from "@/types/learning-progress";
import { logError } from "@/utils/logger";
import { getFullName } from "@/utils/name";
import { PaginatedResult, PaginationOptions } from "@/utils/pagination";
import { fail, ok, Result } from "@/utils/response";
import { collection, doc, endBefore, getCountFromServer, getDoc, getDocs, limit, limitToLast, query, QueryConstraint, setDoc, startAfter, updateDoc, where } from "firebase/firestore";
import { learningProgressService } from "./learningProgressService";

class CertificateRequestService {

    async requestCertificate(
        userId: string,
        courseId: string
    ): Promise<Result<{ requestId: string }>> {
        try {
            const progressQuery = query(
                collection(db, COLLECTION.LEARNING_PROGRESS),
                where("userId", "==", userId),
                where("courseId", "==", courseId)
            );

            const progressSnap = await getDocs(progressQuery);

            if (progressSnap.empty) {
                return fail("Learning progress not found");
            }

            const progressData = progressSnap.docs[0].data() as LearningProgress;
            if (!progressData.completionDate) {
                return fail("Course not completed yet");
            }

            const existingQuery = query(
                collection(db, COLLECTION.CERTIFICATE_REQUESTS),
                where("userId", "==", userId),
                where("courseId", "==", courseId),
                where("status", "==", CERTIFICATE_REQUEST_STATUS.PENDING)
            );

            const existingSnap = await getDocs(existingQuery);
            if (!existingSnap.empty) {
                return fail("Certificate request already pending");
            }

            const userRef = doc(db, COLLECTION.USERS, userId);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                return fail("User not found");
            }

            const { firstName, middleName, lastName, email: userEmail } = userSnap.data();

            const userName = getFullName(firstName, middleName, lastName);

            const courseRef = doc(db, COLLECTION.COURSES, courseId);
            const courseSnap = await getDoc(courseRef);

            if (!courseSnap.exists()) {
                return fail("Course not found");
            }

            const { title: courseName } = courseSnap.data();

            const requestRef = doc(collection(db, COLLECTION.CERTIFICATE_REQUESTS));
            const requestId = requestRef.id;

            const request: CertificateRequest = {
                id: requestId,
                userId,
                userName,
                userEmail,
                courseId,
                courseName,
                status: CERTIFICATE_REQUEST_STATUS.PENDING,
            };

            await setDoc(requestRef, request);
            return ok({ requestId });

        } catch (error: any) {
            logError("CertificateRequestService.requestCertificate", error);
            return fail("Failed to request certificate", error.code || error.message);
        }
    }

    async getCertificateRequests(
        options: PaginationOptions<CertificateRequest> = {},
        status: CertificateRequestStatus | "ALL"
    ): Promise<Result<PaginatedResult<CertificateRequest>>> {
        try {
            const {
                limit: itemsPerPage = 25,
                pageDirection = "next",
                cursor = null,
            } = options;

            const constraints: QueryConstraint[] = [];

            if (status && status !== "ALL") {
                constraints.push(where("status", "==", status));
            }

            if (cursor) {
                constraints.push(
                    pageDirection === "next"
                        ? startAfter(cursor)
                        : endBefore(cursor)
                );
            }

            constraints.push(limit(itemsPerPage));

            let q = query(collection(db, COLLECTION.CERTIFICATE_REQUESTS), ...constraints);

            const countSnapshot = await getCountFromServer(q);
            const totalCount = countSnapshot.data().count;

            if (pageDirection === "previous" && cursor) {
                q = query(
                    q,
                    endBefore(cursor),
                    limitToLast(itemsPerPage)
                );
            } else if (cursor) {
                q = query(
                    q,
                    startAfter(cursor),
                    limit(itemsPerPage)
                );
            } else {
                q = query(
                    q,
                    limit(itemsPerPage)
                );
            }

            const snapshot = await getDocs(q);
            const documents = snapshot.docs;

            if (pageDirection === "previous") {
                documents.reverse();
            }

            const requests: CertificateRequest[] = documents.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Omit<CertificateRequest, "id">),
            }));

            const hasNextPage = snapshot.docs.length === itemsPerPage;
            const hasPreviousPage = cursor !== null;

            const nextCursor = hasNextPage
                ? snapshot.docs[snapshot.docs.length - 1]
                : null;

            const previousCursor = hasPreviousPage
                ? snapshot.docs[0]
                : null;

            return ok({
                data: requests,
                hasNextPage,
                hasPreviousPage,
                nextCursor,
                previousCursor,
                totalCount,
            });

        } catch (error: any) {
            logError(
                "LearningProgressService.getPendingCertificateRequests",
                error
            );
            return fail(
                "Failed to fetch certificate requests",
                error.code || error.message
            );
        }
    }

    async approveCertificateRequest(
        requestId: string,
        adminUid: string
    ): Promise<Result<boolean>> {
        try {
            const adminRef = doc(db, COLLECTION.USERS, adminUid);
            const adminSnap = await getDoc(adminRef);

            if (!adminSnap.exists()) {
                return fail("Admin not found");
            }

            if (adminSnap.data().role !== USER_ROLE.ADMIN) {
                return fail("Unauthorized");
            }

            const requestRef = doc(db, COLLECTION.CERTIFICATE_REQUESTS, requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                return fail("Certificate request not found");
            }

            const request = requestSnap.data() as CertificateRequest;

            const issueResult = await learningProgressService.issueCertificate(
                request.userId,
                request.courseId,
                adminUid
            );

            if (!issueResult.success) {
                return issueResult;
            }

            await updateDoc(requestRef, {
                status: CERTIFICATE_REQUEST_STATUS.APPROVED,
            });

            return ok(true);

        } catch (error: any) {
            logError(
                "LearningProgressService.approveCertificateRequest",
                error
            );
            return fail(
                "Failed to approve certificate request",
                error.code || error.message
            );
        }
    }

    async rejectCertificateRequest(
        requestId: string,
        adminUid: string
    ): Promise<Result<boolean>> {
        try {
            const adminRef = doc(db, COLLECTION.USERS, adminUid);
            const adminSnap = await getDoc(adminRef);

            if (!adminSnap.exists()) {
                return fail("Admin not found");
            }

            if (adminSnap.data().role !== USER_ROLE.ADMIN) {
                return fail("Unauthorized");
            }

            const requestRef = doc(db, COLLECTION.CERTIFICATE_REQUESTS, requestId);

            await updateDoc(requestRef, {
                status: CERTIFICATE_REQUEST_STATUS.REJECTED,
            });

            return ok(true);

        } catch (error: any) {
            logError(
                "LearningProgressService.rejectCertificateRequest",
                error
            );
            return fail(
                "Failed to reject certificate request",
                error.code || error.message
            );
        }
    }

    async getCertificateRequestStatusForCourses(
        userId: string,
        courseIds: string[]
    ): Promise<Result<Record<string, CertificateRequestStatus | null>>> {
        try {
            if (courseIds.length === 0) {
                return ok({});
            }

            const statusMap: Record<string, CertificateRequestStatus | null> = {};

            courseIds.forEach(courseId => {
                statusMap[courseId] = null;
            });

            const BATCH_SIZE = 10;

            for (let i = 0; i < courseIds.length; i += BATCH_SIZE) {
                const batch = courseIds.slice(i, i + BATCH_SIZE);

                const requestQuery = query(
                    collection(db, COLLECTION.CERTIFICATE_REQUESTS),
                    where("userId", "==", userId),
                    where("courseId", "in", batch)
                );

                const snapshot = await getDocs(requestQuery);

                snapshot.docs.forEach(doc => {
                    const data = doc.data() as CertificateRequest;
                    statusMap[data.courseId] = data.status;
                });
            }

            return ok(statusMap);

        } catch (error: any) {
            logError(
                "LearningProgressService.getCertificateRequestStatusForCourses",
                error
            );
            return fail(
                "Failed to fetch certificate request status",
                error.code || error.message
            );
        }
    }
}

export const certificateRequestService = new CertificateRequestService();
