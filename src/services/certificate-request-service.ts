import { CERTIFICATE_REQUEST_STATUS, COLLECTION, USER_ROLE } from "@/constants";
import { db } from "@/firebaseConfig";
import { CertificateRequest } from "@/types/certificate-request";
import { LearningProgress } from "@/types/learning-progress";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
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

            const requestRef = doc(collection(db, COLLECTION.CERTIFICATE_REQUESTS));
            const requestId = requestRef.id;

            const request: CertificateRequest = {
                id: requestId,
                userId,
                courseId,
                status: CERTIFICATE_REQUEST_STATUS.PENDING,
            };

            await setDoc(requestRef, request);

            return ok({ requestId });

        } catch (error: any) {
            logError("LearningProgressService.requestCertificate", error);
            return fail(
                "Failed to request certificate",
                error.code || error.message
            );
        }
    }

    async getPendingCertificateRequests(): Promise<Result<CertificateRequest[]>> {
        try {
            const certRequestQuery = query(
                collection(db, COLLECTION.CERTIFICATE_REQUESTS),
                where("status", "==", CERTIFICATE_REQUEST_STATUS.PENDING)
            );

            const snapshot = await getDocs(certRequestQuery);

            if (snapshot.empty) {
                return ok([]);
            }

            const requests: CertificateRequest[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as CertificateRequest),
            }));

            return ok(requests);

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

            if (request.status !== CERTIFICATE_REQUEST_STATUS.PENDING) {
                return fail("Request already processed");
            }

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
}

export const certificateRequestService = new CertificateRequestService();
