import { firestore } from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { fail, ok, Result } from "../utils/response";

import { COLLECTION } from "../constants";
import { LearningProgress } from "../types/learning-progress";

class LearningProgressService {
  private db: firestore.Firestore;

  constructor() {
    this.db = firestore();
  }

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
      const progressRef = this.db.collection(COLLECTION.LEARNING_PROGRESS).doc();
      const progressId = progressRef.id;

      const newProgress: LearningProgress = {
        id: progressId,
        userId,
        courseId,
        currentLessonId: null,
        lastAccessed: FieldValue.serverTimestamp(),
        lessonHistory: {},
        updatedAt: FieldValue.serverTimestamp(),
      };

      await progressRef.set(newProgress);

      return ok({ progressId });
    } catch (error: any) {
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
    userId: string,
    courseId: string,
    completedLessonId: string,
    type: string,
    isCompleted: boolean
  ): Promise<Result<null>> {
    functions.logger.info(`User ${userId} completed lesson ${completedLessonId} in course ${courseId}`);
    try {
      // 1️⃣ Query progress document for this user + course
      const snapshot = await this.db
        .collection(COLLECTION.LEARNING_PROGRESS)
        .where("userId", "==", userId)
        .where("courseId", "==", courseId)
        .get();

      let progressRef: firestore.DocumentReference;
      let progress: LearningProgress | null = null;

      if (snapshot.empty) {
        console.log("No existing progress found — creating new one...");
        // Create a brand new progress document
        const createResult = await this.createLessonProgress(userId, courseId);
        if (!createResult.success) {
          return fail(
            "Failed to create new progress document.",
          );
        }

        // Retrieve the new doc reference
        progressRef = this.db.collection(COLLECTION.LEARNING_PROGRESS).doc(createResult.data.progressId);
        progress = {
          id: createResult.data.progressId,
          userId,
          courseId,
          currentLessonId: null,
          lessonHistory: {},
          lastAccessed: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
      } else {
        // There should be exactly one document
        const progressDoc = snapshot.docs[0];
        progressRef = progressDoc.ref;
        progress = progressDoc.data() as LearningProgress;
      }

      // 2️⃣ Update lesson history safely (avoid duplicates)
      const updatedLessonHistory = {
        ...(progress.lessonHistory || {}),
        [completedLessonId]: {
          timeSpent: progress.lessonHistory?.[completedLessonId]?.timeSpent || 0,
          markedAsComplete: isCompleted,
          type: type,
          completedAt: isCompleted ? FieldValue.serverTimestamp() : null,
        },
      };

      // 3️⃣ Write update to Firestore
      await progressRef.update({
        currentLessonId: completedLessonId,
        lessonHistory: updatedLessonHistory,
        lastAccessed: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return ok(null);
    } catch (error: any) {
      return fail("Failed to update progress.", error.code || error.message);
    }
  }

  async timeSpentOnLesson(
    userId: string,
    courseId: string,
    lessonId: string,
    timeSpent: number
  ): Promise<Result<null>> {
    try {
      const snapshot = await this.db
        .collection(COLLECTION.LEARNING_PROGRESS)
        .where("userId", "==", userId)
        .where("courseId", "==", courseId)
        .get();

      if (snapshot.empty) {
        return fail("Learning progress not found");
      }

      const progressDoc = snapshot.docs[0];
      const progressRef = progressDoc.ref;
      const progressData = progressDoc.data() as LearningProgress;

      const existingTimeSpent =
        progressData.lessonHistory?.[lessonId]?.timeSpent || 0;

      const updatedLessonHistory = {
        ...(progressData.lessonHistory || {}),
        [lessonId]: {
          timeSpent: existingTimeSpent + timeSpent,
          markedAsComplete: progressData.lessonHistory?.[lessonId]?.markedAsComplete || false,
          completedAt: progressData.lessonHistory?.[lessonId]?.completedAt || null,
        },
      };

      await progressRef.update({
        lessonHistory: updatedLessonHistory,
        lastAccessed: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return ok(null);
    } catch (error: any) {
      return fail("Failed to update time spent.", error.code || error.message);
    }
  }

  async getUserCourseProgress(
    userId: string,
    courseId: string,
  ): Promise<Result<LearningProgress[]>> {
    try {
      const snapshot = await this.db
        .collection(COLLECTION.LEARNING_PROGRESS)
        .where("userId", "==", userId)
        .where("courseId", "==", courseId)
        .get();

      if (snapshot.empty) {
        return ok([]); // no progress found, return empty array
      }

      const progressList: LearningProgress[] = snapshot.docs.map(doc => ({
        ...(doc.data() as LearningProgress),
        id: doc.id,
      }));

      return ok(progressList);

    } catch (error: any) {
      return fail("Failed to fetch user progress.", error.code || error.message);
    }
  }

  async getUserProgress(
    userId: string
  ): Promise<Result<LearningProgress[]>> {
    try {
      const snapshot = await this.db
        .collection(COLLECTION.LEARNING_PROGRESS)
        .where("userId", "==", userId)
        .get();

      if (snapshot.empty) {
        return ok([]); // no progress found, return empty array
      }

      const progressList: LearningProgress[] = snapshot.docs.map(doc => ({
        ...(doc.data() as LearningProgress),
        id: doc.id,
      }));

      return ok(progressList);

    } catch (error: any) {
      return fail("Failed to fetch user progress.", error.code || error.message);
    }
  }

  async completeCourse(
    userId: string,
    courseId: string,
    totalLessons: number
  ): Promise<Result<boolean>> {
    functions.logger.info(`Checking course completion for user ${userId} in course ${courseId}`);
    try {
      if (totalLessons <= 0) {
        return ok(false);
      }

      const snapshot = await this.db
        .collection(COLLECTION.LEARNING_PROGRESS)
        .where("userId", "==", userId)
        .where("courseId", "==", courseId)
        .get();

      if (snapshot.empty) {
        return ok(false);
      }

      const progressDoc = snapshot.docs[0];
      const progressData = progressDoc.data() as LearningProgress;

      // Calculate completed lessons from lessonHistory object
      const lessonHistory = progressData.lessonHistory || {};
      const completedLessons = Array.isArray(lessonHistory)
        ? lessonHistory.length : Object.keys(lessonHistory).length;

      const completionPercentage = (completedLessons / totalLessons) * 100;

      // Check enrollment completion status
      const enrollmentId = `${userId}_${courseId}`;
      const enrollmentRef = this.db.collection(COLLECTION.ENROLLMENTS).doc(enrollmentId);
      const enrollmentSnap = await enrollmentRef.get();

      if (!enrollmentSnap.exists) {
        return fail("Enrollment not found");
      }

      const enrollmentData = enrollmentSnap.data();

      if (!!enrollmentData?.completionDate) {
        return fail("Course already completed");
      }

      if (completionPercentage >= 90 && !enrollmentData?.completionDate) {
        await enrollmentRef.update({
          completionDate: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        functions.logger.info(`User ${userId} completed course ${courseId}`);
        return ok(true);
      }
      functions.logger.info(`User ${userId} has not yet completed course ${courseId}`);
      return fail("Course not yet completed");

    } catch (error: any) {
      return fail(
        "Failed to complete course",
        error.code || error.message
      );
    }
  }
}

export const learningProgressService = new LearningProgressService();
