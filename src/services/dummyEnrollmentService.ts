import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
  arrayUnion,
  getDoc
} from "firebase/firestore";

import { db } from "@/firebaseConfig";
import { Enrollment } from "@/types/enrollment";
import {
  ENROLLED_PROGRAM_TYPE,
  ENROLLMENT_STATUS,
  PRICING_MODEL,
  USER_ROLE
} from "@/constants";
import { EnrolledProgramType } from "@/types/general";
import { LearningProgress } from "@/types/learningProgress";

class EnrollmentService {
  /**
   * Generates a unique enrollment ID in the format: <targetId>_<userId>
   */
  private generateEnrollmentId(userId: string, targetId: string): string {
    return `${targetId}_${userId}`;
  }

  /**
   * Creates a fresh course-level progress object
   */
  private initCourseProgress(
    courseId: string,
    currentLessonId: string = ""
  ): LearningProgress {
    return {
      courseId,
      currentLessonId: currentLessonId || null,
      lastAccessed: new Date(),
      completedLessons: 0,
      lessonHistory: [],
      totalLessons: 0,
      percentage: 0,
      updatedAt: null,
      certification: {
        issued: false
      }
    };
  }

  /**
   * Enroll a user into a course or bundle.
   */
  async enrollUser(
    userId: string,
    targetId: string,
    programType: EnrolledProgramType,
    currentLessonId: string = "",
    // TODO: Can use the bundle Id directly
    bundleCourseIds: string[] = []
  ): Promise<string> {
    try {
      const enrollmentId = this.generateEnrollmentId(userId, targetId);
      const now = new Date();

      let enrollment: Enrollment;

      if (programType === ENROLLED_PROGRAM_TYPE.COURSE) {
        // Single course enrollment
        const progress = this.initCourseProgress(targetId, currentLessonId);

        enrollment = {
          id: enrollmentId,
          userId,
          targetId,
          targetType: programType,
          enrollmentDate: now,
          status: ENROLLMENT_STATUS.ACTIVE,
          role: USER_ROLE.STUDENT,
          progress, // direct course-level progress
          pricingModel: PRICING_MODEL.PAID
        };
      } else {
        // Bundle enrollment
        const bundleProgress = bundleCourseIds.map((courseId) => {
          const progress = this.initCourseProgress(courseId);
          return { courseId: progress.courseId, progressId: progress.id };
        });

        enrollment = {
          id: enrollmentId,
          userId,
          targetId,
          targetType: programType,
          enrollmentDate: now,
          status: ENROLLMENT_STATUS.ACTIVE,
          role: USER_ROLE.STUDENT,
          progress: {
            completedLessons: 0,
            lessonHistory: [],
            totalLessons: 0,
            percentage: 0,
            certification: {
              issued: false
            },
            updatedAt: null
          }, // overall bundle progress
          bundleProgress, // store progress for each course inside bundle
          pricingModel: PRICING_MODEL.PAID
        };
      }

      await setDoc(doc(db, "Enrollments", enrollmentId), enrollment);
      console.log(
        "EnrollmentService - User enrolled successfully:",
        enrollmentId
      );

      // Update user doc for quick access
      const userDocRef = doc(db, "Users", userId);
      await updateDoc(userDocRef, {
        enrollments: arrayUnion({ targetId, targetType: programType })
      });

      return enrollmentId;
    } catch (error) {
      console.error("EnrollmentService - Error enrolling user:", error);
      throw new Error("Failed to enroll user");
    }
  }

  /**
   * Checks if a user is enrolled in a specific course/bundle.
   */
  async isUserEnrolled(userId: string, targetId: string): Promise<boolean> {
    try {
      const enrollmentId = this.generateEnrollmentId(userId, targetId);
      const enrollmentDoc = await getDoc(doc(db, "Enrollments", enrollmentId));

      if (
        enrollmentDoc.exists() &&
        enrollmentDoc.data()?.status === ENROLLMENT_STATUS.ACTIVE
      ) {
        return true;
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
        return {
          ...data,
          enrollmentDate: data.enrollmentDate?.toDate?.() || null,
          updatedAt: data.updatedAt?.toDate?.() || null,
          lastAccessed: data.lastAccessed?.toDate?.() || null,
          completionDate: data.completionDate?.toDate?.() || null
        };
      }) as unknown as Enrollment[];
    } catch (error) {
      console.error("EnrollmentService - Error fetching user enrollments:", error);
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