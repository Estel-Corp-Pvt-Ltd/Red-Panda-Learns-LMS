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
  where,
  onSnapshot
} from "firebase/firestore";

import { db } from "@/firebaseConfig";
import { Enrollment } from "@/types/enrollment";
import { EnrolledProgramType, EnrollmentStatus } from "@/types/general";
import { bundleService } from "./bundleService";
import {
  COLLECTION,
  ENROLLED_PROGRAM_TYPE,
  ENROLLMENT_STATUS,
  PRICING_MODEL,
  USER_ROLE
} from "@/constants";
import { convertToDate } from "@/utils/date-time";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";
import { learningProgressService } from "./learningProgressService";


interface VerifyBundleEnrollmentOptions {
  userId: string;
  courseIds: string[];
  timeoutMs?: number; 
}

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
          pricingModel: PRICING_MODEL.PAID,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(doc(db, COLLECTION.ENROLLMENTS, enrollmentId), enrollment);

      } else {
        // Bundle enrollment
      const bundle = await bundleService.getBundleById(targetId);
if (!bundle) {
  return fail("Bundle not found.", "NotFound");
}

 const bundleCourseIds = bundle.courses.map(c => c.id);

  const progressInput = bundleCourseIds.map(courseId => ({
    courseId,
    totalLessons: 0
  }));

  const batchResult = await learningProgressService.createLessonProgressBatchAtomic(progressInput);
  if (!batchResult.success) {
    return fail(
      "Failed to create progress documents for bundle enrollment.",
      batchResult.error.message
    );
  }

  const bundleProgress = Object.entries(batchResult.data).map(
    ([courseId, progressId]) => ({ courseId, progressId })
  );

  // 2️⃣ Create main bundle enrollment document
  const bundleEnrollment: Enrollment = {
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
    pricingModel: PRICING_MODEL.PAID,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, COLLECTION.ENROLLMENTS, enrollmentId), bundleEnrollment);

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
}

export const enrollmentService = new EnrollmentService();
