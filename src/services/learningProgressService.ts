import {
    collection,
    doc,
    documentId,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";

import { db } from "@/firebaseConfig";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";

import { COLLECTION } from "@/constants";
import { LearningProgress } from "@/types/learning-progress";
import { Enrollment } from "@/types/enrollment";

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

    /**
     * Creates new LearningProgress documents for multiple courses using a Firestore batch write.
     *
     * @param courses - An array of objects, each containing a courseId and its totalLessons.
     * @returns A Result object containing a mapping of course IDs to their created progress IDs on success, or an error on failure.
     */
    async createLessonProgressBatchAtomic(
        courses: { courseId: string; totalLessons: number }[]
    ): Promise<Result<Record<string, string>>> {
        try {
            const batch = writeBatch(db);
            const progressMap: Record<string, string> = {};

            courses.forEach(({ courseId, totalLessons }) => {
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
                    certification: { issued: false },
                    grade: null,
                    completionDate: null,
                    updatedAt: serverTimestamp(),
                };

                batch.set(progressRef, newProgress);
                progressMap[courseId] = progressId;
            });

            // Commit the batch (atomic)
            await batch.commit();

            return ok(progressMap);
        } catch (error: any) {
            logError("LearningProgressService.createLessonProgressBatchAtomic", error);
            return fail(
                "Failed to create lesson progresses for multiple courses.",
                error.code || error.message
            );
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

            const updatedCompletedLessons = (progress.completedLessons || 0) + 1;
            const updatedLessonHistory = [...(progress.lessonHistory || []), completedLessonId];
            const updatedPercentage = (updatedCompletedLessons / progress.totalLessons) * 100;

            await updateDoc(progressRef, {
                currentLessonId: completedLessonId,
                completedLessons: updatedCompletedLessons,
                lessonHistory: updatedLessonHistory,
                percentage: updatedPercentage,
                lastAccessed: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return ok(null);
        } catch (error: any) {
            logError("LearningProgressService.completeLesson", error);
            return fail("Failed to update progress.", error.code || error.message);
        }
    }

    /**
     * Fetch LearningProgress documents either by progress IDs or by enrollment ID.
     * Uses chunked 'in' queries for performance and Firestore limits.
     *
     * @param progressIds - Optional array of progress IDs to fetch
     * @param enrollmentId - Optional enrollment ID to fetch all related progresses
     */
    async fetchProgresses(
        progressIds?: string[],
        enrollmentId?: string
    ): Promise<Result<LearningProgress[]>> {
        try {
            let idsToFetch: string[] = [];

            if (progressIds?.length) {
                idsToFetch = progressIds;
            } else if (enrollmentId) {
                const enrollmentRef = doc(db, COLLECTION.ENROLLMENTS, enrollmentId);
                const enrollmentSnap = await getDoc(enrollmentRef);

                if (!enrollmentSnap.exists()) {
                    return fail("Enrollment not found");
                }

                const enrollment = enrollmentSnap.data() as Enrollment;

                // Add main progress
                idsToFetch.push(enrollment.progressId);

                // Add bundle progresses if any
                if (enrollment.bundleProgress?.length) {
                    idsToFetch.push(...enrollment.bundleProgress.map(bp => bp.progressId));
                }
            } else {
                return fail("Either progressIds or enrollmentId must be provided");
            }

            if (!idsToFetch.length) return ok([]);

            const progresses: LearningProgress[] = [];

            /**
             * Helper to split an array into chunks of given size
             */
            function chunkArray<T>(arr: T[], size: number): T[][] {
                const chunks: T[][] = [];
                for (let i = 0; i < arr.length; i += size) {
                    chunks.push(arr.slice(i, i + size));
                }
                return chunks;
            }

            // Firestore 'in' queries allow max 10 IDs per query
            const batches = chunkArray(idsToFetch, 10);

            for (const batch of batches) {
                const q = query(
                    collection(db, COLLECTION.LEARNING_PROGRESS),
                    where(documentId(), "in", batch)
                );
                const snapshot = await getDocs(q);
                progresses.push(...snapshot.docs.map(doc => doc.data() as LearningProgress));
            }

            return ok(progresses);
        } catch (error: any) {
            logError("LearningProgressService.fetchProgresses", error);
            return fail("Failed to fetch progresses", error.code || error.message);
        }
    }

    /**
     * Fetch a single LearningProgress document by its ID.
     *
     * @param progressId - The ID of the progress document to fetch
     */
    async fetchProgressById(progressId: string): Promise<Result<LearningProgress>> {
        try {
            const progressRef = doc(db, COLLECTION.LEARNING_PROGRESS, progressId);
            const progressSnap = await getDoc(progressRef);

            if (!progressSnap.exists()) {
                return fail("Progress not found");
            }

            const progress = progressSnap.data() as LearningProgress;
            return ok(progress);
        } catch (error: any) {
            logError("LearningProgressService.fetchProgressById", error);
            return fail("Failed to fetch progress", error.code || error.message);
        }
    }
}

export const learningProgressService = new LearningProgressService();

