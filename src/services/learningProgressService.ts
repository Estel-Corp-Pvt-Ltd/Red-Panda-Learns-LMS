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

import { COLLECTION } from "@/constants";
import { LearningProgress } from "@/types/learning-progress";

class LearningProgressService {
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
                lessonHistory: [],
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
  userId: string,
  courseId: string,
  completedLessonId: string
): Promise<Result<null>> {
  try {
    // 1️⃣ Query progress document for this user + course
    const progressQuery = query(
      collection(db, COLLECTION.LEARNING_PROGRESS),
      where("userId", "==", userId),
      where("courseId", "==", courseId)
    );

    const snapshot = await getDocs(progressQuery);

    let progressRef;
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
      progressRef = doc(db, COLLECTION.LEARNING_PROGRESS, createResult.data.progressId);
      progress = {
        id: createResult.data.progressId,
        userId,
        courseId,
        currentLessonId: null,
        lessonHistory: [],
        completionDate: null,
        lastAccessed: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
    } else {
      // There should be exactly one document
      const progressDoc = snapshot.docs[0];
      progressRef = progressDoc.ref;
      progress = progressDoc.data() as LearningProgress;
    }

    // 2️⃣ Update lesson history safely (avoid duplicates)
    const updatedLessonHistory = [
      ...(progress.lessonHistory || []),
      completedLessonId,
    ].filter((v, i, a) => a.indexOf(v) === i);

    // 3️⃣ Write update to Firestore
    await updateDoc(progressRef, {
      currentLessonId: completedLessonId,
      lessonHistory: updatedLessonHistory,
      lastAccessed: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return ok(null);
  } catch (error: any) {
    logError("LearningProgressService.completeLesson", error);
    return fail("Failed to update progress.", error.code || error.message);
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

}

export const learningProgressService = new LearningProgressService();

