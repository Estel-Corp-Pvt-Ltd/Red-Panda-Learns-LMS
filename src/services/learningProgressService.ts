import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
import { lessonService } from "./lessonService";
import { Duration } from "@/types/general";

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
    courseId: string
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
  // async completeLesson(
  //   courseId: string,
  //   itemId: string,
  //   type: string,
  //   isCompleted: boolean
  // ): Promise<Result<null>> {
  //   try {
  //     const idToken = await authService.getToken();
  //     await fetch(`${this.backendUrl}/completeLesson`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${idToken}`,
  //       },
  //       body: JSON.stringify({
  //         courseId,
  //         itemId,
  //         type,
  //         isCompleted,
  //       }),
  //     });
  //     return ok(null);
  //   } catch {
  //     console.error("spendTimeOnLesson error");
  //     return fail("Failed to update time spent.");
  //   }
  // }

  // async timeSpentOnLesson(
  //   courseId: string,
  //   lessonId: string,
  //   timeSpentSec: number,
  //   duration: Duration,
  //   updatedAt: Timestamp | FieldValue,
  //   karmaBoostExpiresAfter: Duration,
  //   lessonType: LessonType
  // ): Promise<Result<null>> {
  //   if (timeSpentSec <= 5) {
  //     return fail("Time spent must be greater than five seconds.");
  //   }
  //   try {
  //     const idToken = await authService.getToken();
  //     const response = await fetch(`${this.backendUrl}/lessonTimeSpent`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${idToken}`,
  //       },
  //       body: JSON.stringify({
  //         courseId,
  //         lessonId,
  //         timeSpentSec,
  //         duration,
  //         updatedAt,
  //         karmaBoostExpiresAfter,
  //         lessonType,
  //       }),
  //     });
  //     if (!response.ok) {
  //       return fail("Failed to update time spent.");
  //     }
  //     return ok(null);
  //   } catch {
  //     console.error("spendTimeOnLesson error");
  //     return fail("Failed to update time spent.");
  //   }
  // }

  // async addedDurationinLearningProgress(
  //   userId: string,
  //   courseId: string,
  //   lessonId: string,
  //   duration: number
  // ): Promise<Result<LearningProgress[]>> {
  //   try {
  //     const progressQuery = query(
  //       collection(db, COLLECTION.LEARNING_PROGRESS),
  //       where("userId", "==", userId),
  //       where("courseId", "==", courseId)
  //     );

  //     const snapshot = await getDocs(progressQuery);

  //     if (snapshot.empty) {
  //       return ok([]);
  //     }

  //     const progressList: LearningProgress[] = snapshot.docs.map((doc) => ({
  //       id: doc.id,
  //       ...(doc.data() as LearningProgress),
  //     }));

  //     // 🔹 Assuming one progress doc per user + course
  //     const progressDoc = snapshot.docs[0];
  //     const progressDocRef = doc(db, COLLECTION.LEARNING_PROGRESS, progressDoc.id);

  //     // 🔹 Update only the lesson duration
  //     await updateDoc(progressDocRef, {
  //       [`lessons.${lessonId}.duration`]: duration,
  //     });

  //     await lessonService.updateLesson(lessonId, {
  //       durationAddedtoLearningProgress: true,
  //     });

  //     return ok(progressList);
  //   } catch (error) {
  //     console.error("Error updating lesson duration:", error);
  //     return error;
  //   }
  // }

  async updateCurrentLesson(
    userId: string,
    courseId: string,
    lessonId: string
  ): Promise<void> {
    try {
      const progressQuery = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );
      const snapshot = await getDocs(progressQuery);
      if (!snapshot.empty) {
        const progressDoc = snapshot.docs[0];
        await updateDoc(doc(db, COLLECTION.LEARNING_PROGRESS, progressDoc.id), {
          currentLessonId: lessonId,
          lastAccessed: serverTimestamp(),
        });
      }
    } catch (error) {
      logError("LearningProgressService.updateCurrentLesson", error);
    }
  }

  async getUserCourseProgress(
    userId: string,
    courseId: string
  ): Promise<Result<LearningProgress[]>> {
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

      const progressList: LearningProgress[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as LearningProgress),
      }));

      return ok(progressList);
    } catch (error: any) {
      logError("LearningProgressService.getUserProgress", error);
      return fail("Failed to fetch user progress.", error.code || error.message);
    }
  }

  async getUserProgress(userId: string): Promise<Result<LearningProgress[]>> {
    try {
      const progressQuery = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("userId", "==", userId)
      );

      const snapshot = await getDocs(progressQuery);

      if (snapshot.empty) {
        return ok([]); // no progress found, return empty array
      }

      const progressList: LearningProgress[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as LearningProgress),
      }));

      return ok(progressList);
    } catch (error: any) {
      logError("LearningProgressService.getUserProgress", error);
      return fail("Failed to fetch user progress.", error.code || error.message);
    }
  }

  // async completeCourse(userId: string, courseId: string): Promise<Result<boolean>> {
  //   try {
  //     const authToken = await authService.getToken();
  //     const response = await fetch(`${this.backendUrl}/completeCourse`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${authToken}`,
  //       },
  //       body: JSON.stringify({
  //         userId,
  //         courseId,
  //       }),
  //     });
  //
  //     if (!response.ok) {
  //       return ok(false);
  //     }
  //
  //     return ok(true);
  //   } catch (error: any) {
  //     logError("LearningProgressService.completeCourse", error);
  //     return fail("Failed to complete course", error.code || error.message);
  //   }
  // }

  // async getCourseTimeSpent(
  //   userId: string,
  //   courseId: string
  // ): Promise<
  //   Result<{ totalTimeSpentSec: number; lessonHistory: LearningProgress["lessonHistory"] }>
  // > {
  //   try {
  //     const idToken = await authService.getToken();
  //     const response = await fetch(`${this.backendUrl}/getCourseTimeSpent`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${idToken}`,
  //       },
  //       body: JSON.stringify({
  //         userId,
  //         courseId,
  //       }),
  //     });
  //
  //     if (!response.ok) {
  //       return fail("Failed to fetch course time spent.");
  //     }
  //
  //     const data = await response.json();
  //     return ok(data.data);
  //   } catch (error: any) {
  //     logError("LearningProgressService.getCourseTimeSpent", error);
  //     return fail("Failed to fetch course time spent.", error.code || error.message);
  //   }
  // }
}

export const learningProgressService = new LearningProgressService();
