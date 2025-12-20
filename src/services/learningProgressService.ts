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
        completionDate: null,
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
    type: string
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

      const progressQuery = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );

      const snapshot = await getDocs(progressQuery);

      if (snapshot.empty) {
        return fail("Learning progress not found");
      }

      const progressDoc = snapshot.docs[0];
      const progressData = progressDoc.data() as LearningProgress;

      if (!progressData.completionDate) {
        return fail("Course not completed yet");
      }

      if (progressData.certification?.issued) {
        return ok(false);
      }

      await updateDoc(
        doc(db, COLLECTION.LEARNING_PROGRESS, progressDoc.id),
        {
          certification: {
            issued: true,
            issuedAt: serverTimestamp(),
            certificateId: `${userId}_${courseId}`,
          },
          updatedAt: serverTimestamp(),
        }
      );

      return ok(true);

    } catch (error: any) {
      logError("LearningProgressService.issueCertificate", error);
      return fail(
        "Failed to issue certificate",
        error.code || error.message
      );
    }
  }

  async getFormattedCompletionDate(
    userId: string,
    courseId: string
  ): Promise<Result<string | null>> {
    try {
      const progressQuery = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );

      const snapshot = await getDocs(progressQuery);

      if (snapshot.empty) {
        return ok(null);
      }

      const progressData = snapshot.docs[0].data() as LearningProgress;

      const formattedDate = formatDate(progressData.completionDate);

      return ok(formattedDate === "—" ? null : formattedDate);

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
}

export const learningProgressService = new LearningProgressService();

