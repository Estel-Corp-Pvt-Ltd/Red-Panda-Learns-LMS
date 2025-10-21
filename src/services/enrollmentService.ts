import {
  arrayUnion,
  collection,
  deleteDoc,
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
import { Enrollment } from "@/types/enrollment";
import { EnrolledProgramType } from "@/types/general";

import {
  COLLECTION,
  ENROLLED_PROGRAM_TYPE,
  ENROLLMENT_STATUS,
  PRICING_MODEL,
  USER_ROLE
} from "@/constants";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";
import { learningProgressService } from "./learningProgressService";

class EnrollmentService {
  /**
   * Generates a unique enrollment ID in the format: <targetId>_<userId>
   */
  private generateEnrollmentId(userId: string, targetId: string): string {
    return `${userId}_${targetId}`; // instead of targetId_userId
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
    userId: string,
    targetId: string,
    programType: EnrolledProgramType,
    bundleCourseIds: string[] = []
  ): Promise<Result<string>> {
    try {
      const enrollmentId = this.generateEnrollmentId(userId, targetId);

      if (programType === ENROLLED_PROGRAM_TYPE.COURSE) {
        // Single course enrollment
        const progressResult = await learningProgressService.createLessonProgress(targetId, 0);
        if (!progressResult.success) {
          return fail(
            "Failed to create progress for single course enrollment.",
            progressResult.error.message
          );
        }

        const enrollment: Enrollment = {
          id: enrollmentId,
          userId,
          targetId,
          targetType: programType,
          enrollmentDate: serverTimestamp(),
          status: ENROLLMENT_STATUS.ACTIVE,
          role: USER_ROLE.STUDENT,
          progressId: progressResult.data.progressId,
          progressSummary: {
            completedLessons: 0,
            totalLessons: 0,
            percent: 0
          },
          pricingModel: PRICING_MODEL.PAID
        };

        await setDoc(doc(db, COLLECTION.ENROLLMENTS, enrollmentId), enrollment);

      } else {
        // Bundle enrollment
        const courses = bundleCourseIds.map((courseId) => ({
          courseId,
          totalLessons: 0
        }));

        const batchResult = await learningProgressService.createLessonProgressBatchAtomic(courses);
        if (!batchResult.success) {
          return fail(
            "Failed to create progress documents for bundle enrollment.",
            batchResult.error.message
          );
        }

        const bundleProgress = Object.entries(batchResult.data).map(
          ([courseId, progressId]) => ({ courseId, progressId })
        );

        const enrollment: Enrollment = {
          id: enrollmentId,
          userId,
          targetId,
          targetType: programType,
          enrollmentDate: serverTimestamp(),
          status: ENROLLMENT_STATUS.ACTIVE,
          role: USER_ROLE.STUDENT,
          bundleProgress,
          progressSummary: {
            completedCourses: 0,
            totalCourses: bundleCourseIds.length,
            percent: 0
          },
          pricingModel: PRICING_MODEL.PAID
        };

        await setDoc(doc(db, COLLECTION.ENROLLMENTS, enrollmentId), enrollment);
      }

      const userDocRef = doc(db, COLLECTION.USERS, userId);
      await updateDoc(userDocRef, {
        enrollments: arrayUnion({ targetId, targetType: programType })
      });

      return ok(enrollmentId);

    } catch (error: any) {
      logError("EnrollmentService.enrollUser", error);
      return fail("Failed to enroll user.", error.code || error.message);
    }
  }

  async isUserEnrolled(userId: string, targetId: string): Promise<boolean> {
    try {
      const enrollmentId = this.generateEnrollmentId(userId, targetId);
      const enrollmentDoc = await getDoc(doc(db, "Enrollments", enrollmentId));

      console.log("EnrollmentDoc snapshot:", enrollmentDoc);

      if (enrollmentDoc.exists()) {
        console.log("EnrollmentDoc data:", enrollmentDoc.data());
        return true; // ✅ only return true if enrollmentDoc exists
      } else {
        console.log("No enrollment found for id:", enrollmentId);
      }

      // If not, check if part of a bundle
      const q = query(
        collection(db, "Enrollments"),
        where("userId", "==", userId),
        where("targetType", "==", ENROLLED_PROGRAM_TYPE.BUNDLE),
        where("status", "==", ENROLLMENT_STATUS.ACTIVE),
        where("bundleCourseIds", "array-contains", targetId)
      );

      const bundleSnapshot = await getDocs(q);
      return !bundleSnapshot.empty;
    } catch (err) {
      console.error("EnrollmentService - Error checking enrollment:", err);
      return false;
    }
  }


  /**
   * Gets all active enrollments for a user.
   */
  async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    try {
      const q = query(
        collection(db, "Enrollments"),
        where("userId", "==", userId),
        where("status", "==", ENROLLMENT_STATUS.ACTIVE)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        // console.log("It the data",data)
        return {
          ...data,
          enrollmentDate: data.enrollmentDate?.toDate?.() || null,
          updatedAt: data.updatedAt?.toDate?.() || null,
          lastAccessed: data.lastAccessed?.toDate?.() || null,
          completionDate: data.completionDate?.toDate?.() || null
        };
      }) as unknown as Enrollment[];
    } catch (error) {
      console.error(
        "EnrollmentService - Error fetching user enrollments:",
        error
      );
      return [];
    }
  }

  /**
   * Deletes an enrollment by ID.
   */
  async deleteEnrollment(enrollmentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "Enrollments", enrollmentId));
      console.log(
        "EnrollmentService - Enrollment deleted successfully:",
        enrollmentId
      );
    } catch (error) {
      console.error("EnrollmentService - Error deleting enrollment:", error);
      throw new Error("Failed to delete enrollment");
    }
  }
}

export const enrollmentService = new EnrollmentService();
