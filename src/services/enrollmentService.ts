import {
  collection,
  deleteDoc,
  doc,
  endBefore,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  Query,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  WhereFilterOp
} from "firebase/firestore";

import {
  COLLECTION,
  ENROLLED_PROGRAM_TYPE,
  ENROLLMENT_STATUS,
  USER_ROLE
} from "@/constants";
import { db } from "@/firebaseConfig";
import { Enrollment } from "@/types/enrollment";
import { EnrollmentStatus } from "@/types/general";
import { BACKEND_URL } from "@/config";
import { authService } from "./authService";
import { TransactionLineItem } from "@/types/transaction";
import { convertToDate, formatDate } from "@/utils/date-time";
import { logError } from "@/utils/logger";
import { PaginatedResult, PaginationOptions } from "@/utils/pagination";
import { fail, ok, Result } from "@/utils/response";

class EnrollmentService {

  private readonly backendUrl = import.meta.env.VITE_BACKEND_URL;
  /**
   * Generates a unique enrollment ID in the format: <targetId>_<userId>
   */
  private generateEnrollmentId(userId: string, targetId: string) {
    return `${userId}_${targetId}`;
  }

  /**
   * Enroll a user into a course or bundle.
   *
   * @param userId - The ID of the user to enroll.
   * @param targetId - The course or bundle ID.
   * @param programType - Type of enrollment (COURSE or BUNDLE).
   * @param bundleCourseIds - Optional list of course IDs if enrolling into a bundle.
   * @returns Result containing the enrollment ID on success, or an error on failure.
   */
  async enrollUser(
    userEmail: string,
    items: TransactionLineItem[]
  ): Promise<Result<any[]>> {
    if (!items || items.length === 0) return fail("No items to enroll");
    try {
      const idToken = await authService.getToken();
      const response = await fetch(`${this.backendUrl}/enrollStudent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userEmail,
          items,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to enroll student");
      }

      const data = await response.json();
      return ok(data.items);
    } catch (error) {
      logError("EnrollmentService.enrollUser", error);
      return fail("Enrollment failed", error.message);
    }
  }

  async enrollUserInFreeCourse(
    courseId: string,
  ): Promise<Result<string>> {

    if (!courseId) return fail("Invalid course ID");

    try {
      const idToken = await authService.getToken();
      const response = await fetch(`${this.backendUrl}/enrollFreeCourse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          courseId: courseId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to enroll student");
      }
      if (response.status === 400) {
        const data = await response.json();
        return ok(data?.items);
      }
      return fail("Enrollment in free course failed");
    } catch (error) {
      logError("EnrollmentService.enrollUser", error);
      return fail("Enrollment failed", error.message);
    }
  }

  async getEnrollmentById(enrollmentId: string): Promise<Result<Enrollment>> {
    try {
      const enrollmentDoc = await getDoc(doc(db, COLLECTION.ENROLLMENTS, enrollmentId));
      if (!enrollmentDoc.exists()) {
        return fail("Enrollment not found");
      }
      const data = enrollmentDoc.data() as Enrollment;
      return ok(data);
    } catch (error: any) {
      logError("EnrollmentService.getEnrollmentById", error);
      return fail("Failed to fetch enrollment by ID.", error.code || error.message);
    }
  }

  async isUserEnrolled(userId: string, targetId: string): Promise<Result<boolean>> {
    try {
      // Check direct enrollment
      const enrollmentId = this.generateEnrollmentId(userId, targetId);
      const enrollmentDoc = await getDoc(doc(db, COLLECTION.ENROLLMENTS, enrollmentId));
      if (enrollmentDoc.exists()) return ok(true);

      // Check bundles
      const q = query(
        collection(db, COLLECTION.ENROLLMENTS),
        where("userId", "==", userId),
        where("targetType", "==", ENROLLED_PROGRAM_TYPE.BUNDLE),
        where("status", "==", ENROLLMENT_STATUS.ACTIVE)
      );
      const snapshot = await getDocs(q);

      const isEnrolledInBundle = snapshot.docs.some(doc =>
        doc.data().bundleProgress?.some((bp: any) => bp.courseId === targetId)
      );

      return ok(isEnrolledInBundle);

    } catch (error: any) {
      logError("EnrollmentService.isUserEnrolled", error);
      return fail("Failed to check user enrollment.", error.code || error.message);
    }
  }

  /**
   * Fetches enrollments for a given user.
   *
   * @param userId - The ID of the user.
   * @param statusFilter - Optional. If provided, filters enrollments by this status. Pass "ALL" to ignore status filtering. Defaults to active enrollments.
   * @returns A Result object containing an array of Enrollment objects on success, or an error on failure.
   */
  async getUserEnrollments(
    userId: string,
    statusFilter: EnrollmentStatus | "ALL" = ENROLLMENT_STATUS.ACTIVE
  ): Promise<Result<Enrollment[]>> {
    try {
      let q;

      if (statusFilter === "ALL") {
        q = query(
          collection(db, COLLECTION.ENROLLMENTS),
          where("userId", "==", userId)
        );
      } else {
        q = query(
          collection(db, COLLECTION.ENROLLMENTS),
          where("userId", "==", userId),
          where("status", "==", statusFilter)
        );
      }

      const querySnapshot = await getDocs(q);

      const enrollments: Enrollment[] = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Enrollment;
        return {
          ...data,
          enrollmentDate: convertToDate(data.enrollmentDate),
          createdAt: convertToDate(data.createdAt),
          updatedAt: convertToDate(data.updatedAt),
        };
      }) as unknown as Enrollment[];

      return ok(enrollments);
    } catch (error: any) {
      logError("EnrollmentService.getUserEnrollments", error);
      return fail(
        "Failed to fetch enrollments for the user.",
        error.code || error.message
      );
    }
  }

  async updateEnrollmentStatus(
    enrollmentId: string,
    status: EnrollmentStatus
  ): Promise<Result<void>> {
    try {
      const enrollmentRef = doc(db, COLLECTION.ENROLLMENTS, enrollmentId);
      await updateDoc(enrollmentRef, {
        status,
        updatedAt: serverTimestamp(),
      });

      return ok(undefined);
    } catch (error: any) {
      return fail("Error updating enrollment status", error.message);
    }
  }

  /**
   * Resolves when all courses are enrolled, or rejects after timeout
   */
  /**
   * Waits until all given courseIds are enrolled (either directly or via bundles).
   * Resolves when all are found, or rejects after timeout.
   */
  async waitForAllEnrollments({
    userId,
    courseIds,
    timeoutMs = 30000,
  }: {
    userId: string;
    courseIds: string[];
    timeoutMs?: number;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!userId || !courseIds.length) return resolve();

      let enrollmentVerified = false;

      // 🔹 Real-time listener on all enrollments of the user
      const q = query(
        collection(db, COLLECTION.ENROLLMENTS),
        where("userId", "==", userId),
        where("status", "==", ENROLLMENT_STATUS.ACTIVE)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const enrolledCourseIds: string[] = [];

          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();

            // Direct course enrollment
            if (data.targetType === ENROLLED_PROGRAM_TYPE.COURSE) {
              enrolledCourseIds.push(data.targetId);
            }

            // Bundle enrollment — collect courseIds from bundleProgress
            if (
              data.targetType === ENROLLED_PROGRAM_TYPE.BUNDLE &&
              Array.isArray(data.bundleProgress)
            ) {
              for (const bp of data.bundleProgress) {
                if (bp.courseId) enrolledCourseIds.push(bp.courseId);
              }
            }
          });

          // ✅ Check if all desired courses are enrolled
          const allEnrolled = courseIds.every((id) =>
            enrolledCourseIds.includes(id)
          );

          if (allEnrolled && !enrollmentVerified) {
            enrollmentVerified = true;
            unsubscribe();
            resolve();
          }
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );

      // 🕒 Timeout fallback
      const timer = setTimeout(() => {
        if (!enrollmentVerified) {
          unsubscribe();
          reject(new Error("Timeout: not all courses enrolled in time"));
        }
      }, timeoutMs);

      // Cleanup timer if resolved early
      const stop = () => {
        clearTimeout(timer);
        unsubscribe();
      };
    });
  }

  /**
 * Deletes an enrollment by its ID.
 *
 * @param enrollmentId - The unique ID of the enrollment to delete.
 * @returns A Result object indicating success or failure.
 */
  async deleteEnrollment(enrollmentId: string): Promise<Result<void>> {
    try {
      await deleteDoc(doc(db, COLLECTION.ENROLLMENTS, enrollmentId));
      return ok(null); // ✅ standard success response
    } catch (error: any) {
      logError("EnrollmentService.deleteEnrollment", error);
      return fail(
        "Failed to delete enrollment.",
        error.code || error.message
      );
    }
  }

  /**
   * Get enrollments with filtering and pagination
   */
  async getEnrollments(
    filters?: {
      field: keyof Enrollment;
      op: WhereFilterOp;
      value: any;
    }[],
    options: PaginationOptions<Enrollment> = {}
  ): Promise<Result<PaginatedResult<Enrollment>>> {
    try {
      const {
        limit: itemsPerPage = 25,
        orderBy: orderByOption = { field: "enrollmentDate", direction: "desc" },
        pageDirection = "next",
        cursor = null,
      } = options;

      let q: Query = collection(db, COLLECTION.ENROLLMENTS);

      // Apply filters if provided
      if (filters && filters.length > 0) {
        // For string search (courseName, userName, userEmail), we need separate handling
        // since we can't mix range queries on different fields without composite indexes
        const stringSearchFilters = filters.filter(f =>
          ['courseName', 'userName', 'userEmail'].includes(f.field as string) &&
          f.op === '>=' &&
          typeof f.value === 'string'
        );

        const otherFilters = filters.filter(f =>
          !(['courseName', 'userName', 'userEmail'].includes(f.field as string) && f.op === '>=')
        );

        // Apply string search filters (only one at a time)
        if (stringSearchFilters.length > 0) {
          // Take only the first string search filter to avoid composite index requirements
          const searchFilter = stringSearchFilters[0];
          q = query(
            q,
            where(searchFilter.field as string, '>=', searchFilter.value),
            where(searchFilter.field as string, '<=', searchFilter.value + '\uf8ff')
          );
        }

        // Apply other filters (date ranges, etc.)
        if (otherFilters.length > 0) {
          const whereClauses = otherFilters.map((f) =>
            where(f.field as string, f.op, f.value)
          );
          q = query(q, ...whereClauses);
        }
      }

      const countQuery = query(q); // Same query without pagination
      const countSnapshot = await getCountFromServer(countQuery);
      const totalCount = countSnapshot.data().count;

      // Apply ordering
      const { field, direction } = orderByOption;

      // For pagination, we need to handle different scenarios
      if (pageDirection === "previous" && cursor) {
        // Previous page - use endBefore with limitToLast
        q = query(
          q,
          orderBy(field as string, direction),
          endBefore(cursor),
          limitToLast(itemsPerPage)
        );
      } else if (cursor) {
        // Next page - use startAfter
        q = query(
          q,
          orderBy(field as string, direction),
          startAfter(cursor),
          limit(itemsPerPage)
        );
      } else {
        // First page - simple limit
        q = query(q, orderBy(field as string, direction), limit(itemsPerPage));
      }

      const querySnapshot = await getDocs(q);

      // Get the documents for pagination cursors
      const documents = querySnapshot.docs;

      if (pageDirection === "previous") {
        // For previous page, we need to reverse the order since we used limitToLast
        documents.reverse();
      }

      const enrollments = documents.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          userName: data.userName || '',
          userEmail: data.userEmail || '',
          courseId: data.courseId,
          courseName: data.courseName,
          bundleId: data.bundleId || '',
          enrollmentDate: data.enrollmentDate,
          status: data.status,
          completionDate: data.completionDate || null,
          certification: data.certification || null,
          orderId: data.orderId || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as Enrollment;
      });

      // Determine pagination metadata
      const hasNextPage = querySnapshot.docs.length === itemsPerPage;
      const hasPreviousPage = cursor !== null;

      // Get cursors for next and previous pages
      const nextCursor = hasNextPage
        ? querySnapshot.docs[querySnapshot.docs.length - 1]
        : null;
      const previousCursor = hasPreviousPage ? querySnapshot.docs[0] : null;

      console.log("EnrollmentService - Fetched enrollments:", {
        count: enrollments.length,
        hasNextPage,
        hasPreviousPage,
        filters: filters?.length || 0
      });

      return ok({
        data: enrollments,
        hasNextPage,
        hasPreviousPage,
        nextCursor,
        previousCursor,
        totalCount
      });
    } catch (error: any) {
      console.error("EnrollmentService - Error fetching enrollments:", error);
      return fail("Error fetching enrollments", error.message);
    }
  }

  /**
   * Updates certificate details (preferredName and completionDate) for an enrollment.
   *
   * @param enrollmentId - The ID of the enrollment to update.
   * @param preferredName - The preferred name to display on the certificate.
   * @param completionDate - The completion date for the certificate (as Date or null).
   * @returns A Result object containing success status.
   */
  async updateCertificateDetails(
    enrollmentId: string,
    preferredName: string | null,
    completionDate: Date | null
  ): Promise<Result<boolean>> {
    try {
      const enrollmentRef = doc(db, COLLECTION.ENROLLMENTS, enrollmentId);
      const enrollmentSnap = await getDoc(enrollmentRef);

      if (!enrollmentSnap.exists()) {
        return fail("Enrollment not found");
      }

      const enrollmentData = enrollmentSnap.data() as Enrollment;

      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      // Update certification object if it exists
      if (enrollmentData.certification) {
        updateData.certification = {
          ...enrollmentData.certification,
          preferredName: preferredName || null,
        };
      }

      // Update completionDate
      if (completionDate) {
        updateData.completionDate = completionDate;
      } else {
        updateData.completionDate = null;
      }

      await updateDoc(enrollmentRef, updateData);
      console.log("Certificate details updated successfully.");
      return ok(true);

    } catch (error: any) {
      logError("EnrollmentService.updateCertificateDetails", error);
      return fail(
        "Failed to update certificate details",
        error.code || error.message
      );
    }
  }


  async issueCertificate(
    userId: string,
    courseId: string,
    remark: string = "Certificate issued"
  ): Promise<Result<boolean>> {
    try {
      // Verify enrollment exists
      const enrollmentId = `${userId}_${courseId}`;
      const enrollmentRef = doc(db, COLLECTION.ENROLLMENTS, enrollmentId);
      const enrollmentSnap = await getDoc(enrollmentRef);

      if (!enrollmentSnap.exists()) {
        return fail("Enrollment not found");
      }

      const enrollmentData = enrollmentSnap.data() as Enrollment;

      if (enrollmentData.certification?.issued) {
        return ok(false);
      }

      // Use bulk certificate issuance API
      const idToken = await authService.getToken();

      const response = await fetch(
        `${BACKEND_URL}/bulkIssueCertificates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            enrollments: [enrollmentId],
            remark: remark
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        return fail("Failed to issue certificate via API");
      }

      // Check if certificate was issued successfully
      if (data.issued > 0) {
        return ok(true);
      } else if (data.skipped > 0) {
        // Certificate was skipped (already issued or requirements not met)
        return ok(false);
      }

      return fail("Certificate issuance failed");

    } catch (error: any) {
      logError("EnrollmentService.issueCertificate", error);
      return fail(
        "Failed to issue certificate",
        error.code || error.message
      );
    }
  }
  /**
 * Sets or updates the certification remark for a user's course enrollment.
 *
 * @param userId - ID of the student
 * @param courseId - ID of the course
 * @param remark - Optional remark text
 */
  async setCertificationRemark(
    userId: string,
    courseId: string,
    remark: string | null
  ): Promise<Result<boolean>> {
    try {
      const enrollmentId = `${userId}_${courseId}`;
      const enrollmentRef = doc(db, COLLECTION.ENROLLMENTS, enrollmentId);
      const enrollmentSnap = await getDoc(enrollmentRef);

      if (!enrollmentSnap.exists()) {
        return fail("Enrollment not found");
      }

      const enrollmentData = enrollmentSnap.data() as Enrollment;

      await updateDoc(enrollmentRef, {
        certification: {
          ...(enrollmentData.certification || {}),
          remark: remark || null,
        },
        updatedAt: serverTimestamp(),
      });

      return ok(true);

    } catch (error: any) {
      logError("EnrollmentService.setCertificationRemark", error);
      return fail(
        "Failed to update certification remark",
        error.code || error.message
      );
    }
  }

  async getCertificateByCertificateId(certificateId: string) {
    try {
      const q = query(
        collection(db, COLLECTION.ENROLLMENTS),
        where("certification.certificateId", "==", certificateId),
        where("certification.issued", "==", true)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return fail("Certificate not found");
      }

      const enrollmentDoc = snapshot.docs[0];
      const enrollment = enrollmentDoc.data() as Enrollment;

      const formattedCompletionDate = formatDate(enrollment.completionDate);

      return ok({
        userName: enrollment.certification?.preferredName || enrollment.userName,
        courseId: enrollment.courseId,
        courseName: enrollment.courseName,
        completionDate: formattedCompletionDate === "—" ? null : formattedCompletionDate,
      });
    } catch (error: any) {
      logError(
        "EnrollmentService.getCertificateByCertificateId",
        error
      );
      return fail(
        "Failed to fetch certificate",
        error.code || error.message
      );
    }
  }


  /**
 * Updates the preferred name on the certificate for a user's course enrollment.
 *
 * @param userId - ID of the student
 * @param courseId - ID of the course
 * @param preferredName - The preferred name to be displayed on the certificate
 * @returns A Result object indicating success or failure.
 */
  async updatePreferredNameOnCertificate(
    userId: string,
    courseId: string,
    preferredName: string | null
  ): Promise<Result<boolean>> {
    try {
      const enrollmentId = `${userId}_${courseId}`;
      const enrollmentRef = doc(db, COLLECTION.ENROLLMENTS, enrollmentId);
      const enrollmentSnap = await getDoc(enrollmentRef);

      if (!enrollmentSnap.exists()) {
        return fail("Enrollment not found");
      }

      const enrollmentData = enrollmentSnap.data() as Enrollment;

      await updateDoc(enrollmentRef, {
        certification: {
          ...(enrollmentData.certification || {}),
          preferredName: preferredName || null,
        },
        updatedAt: serverTimestamp(),
      });
      console.log("Preferred name on certificate updated successfully.");
      return ok(true);

    } catch (error: any) {
      logError("EnrollmentService.updatePreferredNameOnCertificate", error);
      return fail(
        "Failed to update preferred name on certificate",
        error.code || error.message
      );
    }
  }

  /**
   * Checks if the preferred name is set for the certificate in the user's course enrollment.
   *
   * @param userId - ID of the student
   * @param courseId - ID of the course
   * @returns A Result object containing the preferred name if set, or null if not.
   */
  async isPreferredNameSetForCertificate(
    userId: string,
    courseId: string
  ): Promise<Result<string | null>> {
    try {
      const enrollmentId = `${userId}_${courseId}`;
      const enrollmentRef = doc(db, COLLECTION.ENROLLMENTS, enrollmentId);
      const enrollmentSnap = await getDoc(enrollmentRef);

      if (!enrollmentSnap.exists()) {
        return fail("Enrollment not found");
      }

      const enrollmentData = enrollmentSnap.data() as Enrollment;

      // Check if preferredName exists
      const preferredName = enrollmentData.certification?.preferredName;

      if (preferredName && preferredName.trim() !== "") {
        return ok(preferredName);  // Return the preferred name if set
      }

      return ok(null);  // Return null if the preferred name is not set

    } catch (error: any) {
      logError("EnrollmentService.isPreferredNameSetForCertificate", error);
      return fail(
        "Failed to check if preferred name is set for certificate",
        error.code || error.message
      );
    }
  }
}

export const enrollmentService = new EnrollmentService();
