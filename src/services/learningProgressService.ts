import {
    collection,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc
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
        progressId: string,
        completedLessonId: string
    ): Promise<Result<null>> {
        try {
            const progressRef = doc(db, COLLECTION.LEARNING_PROGRESS, progressId);
            const docSnap = await getDoc(progressRef);

            if (!docSnap.exists()) {
                return fail("Progress document not found.");
            }

            const progress = docSnap.data() as LearningProgress;

            const updatedLessonHistory = [...(progress.lessonHistory || []), completedLessonId];

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
}

export const learningProgressService = new LearningProgressService();

