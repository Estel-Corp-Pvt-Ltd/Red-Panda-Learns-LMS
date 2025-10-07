import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  arrayUnion,
  getDoc,
  serverTimestamp,
  FieldValue,
  updateDoc
} from "firebase/firestore";

import { db } from "@/firebaseConfig";
import { Enrollment } from "@/types/enrollment";
import { EnrolledProgramType } from "@/types/general";
import { LearningProgress } from "@/types/learningProgress";

import {
  ENROLLED_PROGRAM_TYPE,
  ENROLLMENT_STATUS,
  PRICING_MODEL,
  USER_ROLE
} from "@/constants";

class EnrollmentService {
  /**
   * Generates a unique enrollment ID in the format: <targetId>_<userId>
   */
 private generateEnrollmentId(userId: string, targetId: string): string {
  return `${userId}_${targetId}`; // instead of targetId_userId
}

  /**
   * Creates a fresh course-level progress object
   */
  private initCourseProgress(
    courseId: string,
    currentLessonId: string = ""
  ): LearningProgress {
    return {
      id: `${courseId}_${Date.now()}`, // unique progress id
      courseId,
      currentLessonId: currentLessonId || null,
      lastAccessed: serverTimestamp(),
      completedLessons: 0,
      lessonHistory: [],
      totalLessons: 0,
      percentage: 0,
      updatedAt: serverTimestamp(),
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
    bundleCourseIds: string[] = []
  ): Promise<string> {
    const enrollmentId = this.generateEnrollmentId(userId, targetId);
    console.log("📌 EnrollUser called with:", {
      userId,
      targetId,
      programType,
      currentLessonId,
      bundleCourseIds,
      enrollmentId
    });

    try {
      let enrollment: Enrollment;

      if (programType === ENROLLED_PROGRAM_TYPE.COURSE) {
        // Single course enrollment
        const progress = this.initCourseProgress(targetId, currentLessonId);

        enrollment = {
          id: enrollmentId,
          userId,
          targetId,
          targetType: programType,
          enrollmentDate: serverTimestamp(),
          status: ENROLLMENT_STATUS.ACTIVE,
          role: USER_ROLE.STUDENT,
          progress,
          pricingModel: PRICING_MODEL.PAID
        } as unknown as Enrollment;
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
          enrollmentDate: serverTimestamp(),
          status: ENROLLMENT_STATUS.ACTIVE,
          role: USER_ROLE.STUDENT,
          progress: {
            completedLessons: 0,
            lessonHistory: [],
            totalLessons: 0,
            percentage: 0,
            certification: { issued: false },
            updatedAt: serverTimestamp()
          },
          bundleProgress,
          pricingModel: PRICING_MODEL.PAID
        } as unknown as Enrollment;
      }

      // Save enrollment
      console.log("📝 Writing enrollment doc:", enrollmentId);
      await setDoc(doc(db, "Enrollments", enrollmentId), enrollment);
      console.log("✅ Enrollment doc written:", enrollmentId);

      // Update user with new enrollment
      const userDocRef = doc(db, "Users", userId);
      console.log("🔄 Updating user doc with enrollment:", {
        userId,
        targetId,
        programType
      });

      await updateDoc(
        userDocRef,
        { enrollments: arrayUnion({ targetId, targetType: programType }) },
       
      );

      console.log("✅ User doc updated:", userId);

      return enrollmentId;
    } catch (error: any) {
      console.error(
        "❌ EnrollmentService - Error enrolling user:",
        error?.message,
        error
      );
      throw new Error(error?.message || "Failed to enroll user");
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
