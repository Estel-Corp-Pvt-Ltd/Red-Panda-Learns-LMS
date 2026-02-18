import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
export const getLearningProgressSchema = {
    userId: z.string().optional().describe("Filter by user ID"),
    courseId: z.string().optional().describe("Filter by course ID"),
    limit: z.number().optional().default(50).describe("Maximum number of results (default 50)"),
};
export async function getLearningProgress(params) {
    // If both userId and courseId are given, fetch the specific document directly
    if (params.userId && params.courseId) {
        const docId = `${params.userId}_${params.courseId}`;
        const doc = await db.collection(COLLECTION.LEARNING_PROGRESS).doc(docId).get();
        if (!doc.exists) {
            return { progress: [], count: 0, message: "No learning progress found for this user/course combination" };
        }
        const data = doc.data();
        return {
            progress: [{
                    id: doc.id,
                    userId: data.userId,
                    courseId: data.courseId,
                    completedLessons: data.completedLessons ?? [],
                    completedAssignments: data.completedAssignments ?? [],
                    completedLessonCount: (data.completedLessons ?? []).length,
                    completedAssignmentCount: (data.completedAssignments ?? []).length,
                    lastAccessedLesson: data.lastAccessedLesson ?? null,
                    totalTimeSpent: data.totalTimeSpent ?? 0,
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
                }],
            count: 1,
        };
    }
    let query = db.collection(COLLECTION.LEARNING_PROGRESS);
    if (params.userId) {
        query = query.where("userId", "==", params.userId);
    }
    if (params.courseId) {
        query = query.where("courseId", "==", params.courseId);
    }
    query = query.limit(params.limit ?? 50);
    const snapshot = await query.get();
    const progress = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            userId: data.userId,
            courseId: data.courseId,
            completedLessonCount: (data.completedLessons ?? []).length,
            completedAssignmentCount: (data.completedAssignments ?? []).length,
            lastAccessedLesson: data.lastAccessedLesson ?? null,
            totalTimeSpent: data.totalTimeSpent ?? 0,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
        };
    });
    return { progress, count: progress.length };
}
//# sourceMappingURL=get_learning_progress.js.map