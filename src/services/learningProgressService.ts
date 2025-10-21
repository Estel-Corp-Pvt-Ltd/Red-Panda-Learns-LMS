import {
    collection,
    doc,
    serverTimestamp,
    setDoc,
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
        courseId: string,
        totalLessons: number
    ): Promise<Result<{ progressId: string }>> {
        try {
            const progressRef = doc(collection(db, COLLECTION.LEARNING_PROGRESS));
            const progressId = progressRef.id;

            const newProgress: LearningProgress = {
                id: progressId,
                courseId,
                currentLessonId: null,
                lastAccessed: serverTimestamp(),
                completedLessons: 0,
                lessonHistory: [],
                totalLessons,
                percentage: 0,
                certification: {
                    issued: false,
                },
                grade: null,
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
}

export const learningProgressService = new LearningProgressService();
