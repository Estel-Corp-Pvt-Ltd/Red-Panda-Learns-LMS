import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";

import { db } from "@/firebaseConfig";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";

import { COLLECTION, USER_ROLE } from "@/constants";
import { Enrollment } from "@/types/enrollment";
import { LearningProgress } from "@/types/learning-progress";
import { formatDate } from "@/utils/date-time";
import { lessonAnalyticsService } from "./analytics/lessonAnalyticsService";
import { authService } from "./authService";

class LearningProgressService {
  private backendUrl = import.meta.env.VITE_BACKEND_URL || "";
  /**
   * Creates a new LearningProgress document for a course.
   *
   * @param courseId - The ID of the course the student is enrolled in.
   * @param totalLessons - The total number of lessons in the course.
   * @returns A Result object containing the created progress ID on success, or an error on failure.
   */
  async createLessonProgress(
    userId: string,
    courseId: string,
  ): Promise<Result<{ progressId: string }>> {
    try {
      const progressRef = doc(collection(db, COLLECTION.LEARNING_PROGRESS));
      const progressId = progressRef.id;

      const newProgress: LearningProgress = {
        id: progressId,
        userId,
        courseId,
        currentLessonId: null,
        lastAccessed: serverTimestamp(),
        lessonHistory: {},
        updatedAt: serverTimestamp(),
      };

      await setDoc(progressRef, newProgress);

      return ok({ progressId });
    } catch (error: any) {
      logError("LearningProgressService.createLessonProgress", error);
      return fail("Failed to create lesson progress.", error.code || error.message);
    }
  }

  /**
  * Updates the LearningProgress document when a lesson is completed.
  *
  * @param progressId - The ID of the LearningProgress document.
  * @param completedLessonId - The ID of the lesson that was just completed.
  */
  async completeLesson(
    courseId: string,
    itemId: string,
    type: string,
    isCompleted: boolean
  ): Promise<Result<null>> {
    try {
      const idToken = await authService.getToken();
      await fetch(`${this.backendUrl}/completeLesson`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          courseId,
          itemId,
          type,
          isCompleted
        }),
      });
      return ok(null);
    } catch {
      console.error("spendTimeOnLesson error");
      return fail("Failed to update time spent.");
    }
  }

  async timeSpentOnLesson(courseId: string, lessonId: string, timeSpentSec: number): Promise<Result<null>> {
    try {
      const idToken = await authService.getToken();
      const response = await fetch(`${this.backendUrl}/lessonTimeSpent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          courseId,
          lessonId,
          timeSpentSec,
        }),
      });
      if (!response.ok) {
        return fail("Failed to update time spent.");
      }
      return ok(null);
    } catch {
      console.error("spendTimeOnLesson error");
      return fail("Failed to update time spent.");
    }
  }

  async getUserCourseProgress(userId: string, courseId: string): Promise<Result<LearningProgress[]>> {
    try {
      const progressQuery = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );

      const snapshot = await getDocs(progressQuery);

      if (snapshot.empty) {
        return ok([]); // no progress found, return empty array
      }

      const progressList: LearningProgress[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as LearningProgress),
      }));

      return ok(progressList);

    } catch (error: any) {
      logError("LearningProgressService.getUserProgress", error);
      return fail("Failed to fetch user progress.", error.code || error.message);
    }
  }


  async getUserProgress(
    userId: string
  ): Promise<Result<LearningProgress[]>> {
    try {
      const progressQuery = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("userId", "==", userId)
      );

      const snapshot = await getDocs(progressQuery);

      if (snapshot.empty) {
        return ok([]); // no progress found, return empty array
      }

      const progressList: LearningProgress[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as LearningProgress),
      }));

      return ok(progressList);

    } catch (error: any) {
      logError("LearningProgressService.getUserProgress", error);
      return fail("Failed to fetch user progress.", error.code || error.message);
    }
  }

  async completeCourse(
    userId: string,
    courseId: string,
  ): Promise<Result<boolean>> {
    try {
      const authToken = await authService.getToken();
      const response = await fetch(`${this.backendUrl}/completeCourse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          userId,
          courseId,
        }),
      });

      if (!response.ok) {
        return ok(false);
      }

      return ok(true);

    } catch (error: any) {
      logError("LearningProgressService.completeCourse", error);
      return fail(
        "Failed to complete course",
        error.code || error.message
      );
    }
  }

  async issueCertificate(
    userId: string,
    courseId: string,
    issuerUid: string
  ): Promise<Result<boolean>> {
    try {
      const issuerRef = doc(db, COLLECTION.USERS, issuerUid);
      const issuerSnap = await getDoc(issuerRef);

      if (!issuerSnap.exists()) {
        return fail("Issuer not found");
      }

      const issuerData = issuerSnap.data();

      if (issuerData.role !== USER_ROLE.ADMIN) {
        return fail("Only ADMIN can issue certificates");
      }

      const enrollmentId = `${userId}_${courseId}`;
      const enrollmentRef = doc(db, COLLECTION.ENROLLMENTS, enrollmentId);
      const enrollmentSnap = await getDoc(enrollmentRef);

      if (!enrollmentSnap.exists()) {
        return fail("Enrollment not found");
      }

      const enrollmentData = enrollmentSnap.data() as Enrollment;

      if (!enrollmentData.completionDate) {
        return fail("Course not completed yet");
      }

      if (enrollmentData.certification?.issued) {
        return ok(false);
      }

      await updateDoc(enrollmentRef, {
        certification: {
          issued: true,
          issuedAt: serverTimestamp(),
          certificateId: crypto.randomUUID(),
        },
        updatedAt: serverTimestamp(),
      });

      return ok(true);

    } catch (error: any) {
      logError("LearningProgressService.issueCertificate", error);
      return fail(
        "Failed to issue certificate",
        error.code || error.message
      );
    }
  }

  async getFormattedCompletionDateAndCertificateId(
    userId: string,
    courseId: string
  ): Promise<Result<{ completionDate: string | null; certificateId: string | null; }>> {
    try {
      const enrollmentId = `${userId}_${courseId}`;
      const enrollmentRef = doc(db, COLLECTION.ENROLLMENTS, enrollmentId);
      const enrollmentSnap = await getDoc(enrollmentRef);

      if (!enrollmentSnap.exists()) {
        return ok(null);
      }

      const enrollmentData = enrollmentSnap.data() as Enrollment;

      const formattedDate = formatDate(enrollmentData.completionDate);

      return ok({
        completionDate: formattedDate === "—" ? null : formattedDate,
        certificateId: enrollmentData.certification?.certificateId || null
      });

    } catch (error: any) {
      logError(
        "LearningProgressService.getFormattedCompletionDate",
        error
      );
      return fail(
        "Failed to fetch completion date.",
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
      logError("LearningProgressService.setCertificationRemark", error);
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
        "LearningProgressService.getCertificateByCertificateId",
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
      logError("LearningProgressService.updatePreferredNameOnCertificate", error);
      return fail(
        "Failed to update preferred name on certificate",
        error.code || error.message
      );
    }
  }



  async getCertificateStatusForPairs(
    pairs: { userId: string; courseId: string }[]
  ): Promise<Result<{ userId: string; courseId: string; isCertificateIssued: boolean, remark: string; }[]>> {
    try {
      if (!Array.isArray(pairs) || pairs.length === 0) {
        return ok([]);
      }

      const results: {
        userId: string;
        courseId: string;
        isCertificateIssued: boolean;
        remark: string;
      }[] = [];

      // Keep concurrency reasonable
      const READ_CONCURRENCY = 10;

      for (let i = 0; i < pairs.length; i += READ_CONCURRENCY) {
        const chunk = pairs.slice(i, i + READ_CONCURRENCY);

        const enrollmentDocs = await Promise.all(
          chunk.map(({ userId, courseId }) => {
            const enrollmentId = `${userId}_${courseId}`;
            return getDoc(doc(db, COLLECTION.ENROLLMENTS, enrollmentId));
          })
        );

        enrollmentDocs.forEach((enrollmentSnap, index) => {
          const { userId, courseId } = chunk[index];

          if (!enrollmentSnap.exists()) {
            results.push({
              userId,
              courseId,
              isCertificateIssued: false,
              remark: "N/A"
            });
            return;
          }

          const enrollment = enrollmentSnap.data() as Enrollment;
          results.push({
            userId,
            courseId,
            isCertificateIssued: enrollment.certification?.issued === true,
            remark: enrollment.certification?.remark || "N/A"
          });
        });
      }

      return ok(results);

    } catch (error: any) {
      logError(
        "LearningProgressService.getCertificateStatusForPairs",
        error
      );
      return fail(
        "Failed to fetch certificate status",
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
      logError("LearningProgressService.isPreferredNameSetForCertificate", error);
      return fail(
        "Failed to check if preferred name is set for certificate",
        error.code || error.message
      );
    }
  }




  async getCourseTimeSpent(userId: string, courseId: string): Promise<Result<{ totalTimeSpentSec: number, lessonHistory: LearningProgress["lessonHistory"] }>> {
    try {
      const idToken = await authService.getToken();
      const response = await fetch(`${this.backendUrl}/getCourseTimeSpent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId,
          courseId,
        }),
      });

      if (!response.ok) {
        return fail("Failed to fetch course time spent.");
      }

      const data = await response.json();
      return ok(data.data);

    } catch (error: any) {
      logError("LearningProgressService.getCourseTimeSpent", error);
      return fail("Failed to fetch course time spent.", error.code || error.message);
    }
  }
}

export const learningProgressService = new LearningProgressService();
