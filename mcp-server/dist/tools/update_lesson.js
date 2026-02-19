import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
const LESSON_TYPES = [
    "SLIDE DECK",
    "VIDEO LECTURE",
    "INTERACTIVE PROJECT",
    "PDF",
    "MIRO BOARD",
    "TEXT",
    "ZOOM MEETING",
    "ZOOM RECORDED_LECTURE",
];
export const updateLessonSchema = {
    lessonId: z.string().describe("The lesson ID to update (e.g. lesson_30001234)"),
    title: z.string().optional().describe("New lesson title"),
    type: z.enum(LESSON_TYPES).optional().describe("New lesson type"),
    description: z.string().optional().describe("New lesson description"),
    embedUrl: z.string().optional().describe("New embed URL"),
    durationHours: z.number().optional().describe("Lesson duration hours"),
    durationMinutes: z.number().optional().describe("Lesson duration minutes"),
};
export async function updateLesson(params) {
    const lessonRef = db.collection(COLLECTION.LESSONS).doc(params.lessonId);
    const lessonDoc = await lessonRef.get();
    if (!lessonDoc.exists) {
        throw new Error(`Lesson not found: ${params.lessonId}`);
    }
    const data = lessonDoc.data();
    const updateData = {
        updatedAt: FieldValue.serverTimestamp(),
    };
    const updatedFields = [];
    if (params.title !== undefined) {
        updateData.title = params.title;
        updatedFields.push("title");
    }
    if (params.type !== undefined) {
        updateData.type = params.type;
        updatedFields.push("type");
    }
    if (params.description !== undefined) {
        updateData.description = params.description;
        updatedFields.push("description");
    }
    if (params.embedUrl !== undefined) {
        updateData.embedUrl = params.embedUrl;
        updatedFields.push("embedUrl");
    }
    if (params.durationHours !== undefined || params.durationMinutes !== undefined) {
        const existing = data.duration || { hours: 0, minutes: 0 };
        updateData.duration = {
            hours: params.durationHours ?? existing.hours,
            minutes: params.durationMinutes ?? existing.minutes,
        };
        updatedFields.push("duration");
    }
    if (updatedFields.length === 0) {
        return {
            lessonId: params.lessonId,
            message: "No fields to update",
            updatedFields: [],
        };
    }
    await lessonRef.update(updateData);
    // If title changed, also update the TopicItem title in the course
    if (params.title !== undefined && data.courseId) {
        const courseRef = db.collection(COLLECTION.COURSES).doc(data.courseId);
        const courseDoc = await courseRef.get();
        if (courseDoc.exists) {
            const courseData = courseDoc.data();
            const topics = courseData.topics || [];
            let titleUpdatedInCourse = false;
            for (const topic of topics) {
                for (const item of topic.items || []) {
                    if (item.id === params.lessonId) {
                        item.title = params.title;
                        titleUpdatedInCourse = true;
                        break;
                    }
                }
                if (titleUpdatedInCourse)
                    break;
            }
            if (titleUpdatedInCourse) {
                await courseRef.update({
                    topics,
                    updatedAt: FieldValue.serverTimestamp(),
                });
            }
        }
    }
    return {
        lessonId: params.lessonId,
        courseId: data.courseId,
        updatedFields,
        message: `Lesson "${params.lessonId}" updated successfully (${updatedFields.length} field${updatedFields.length > 1 ? "s" : ""})`,
    };
}
//# sourceMappingURL=update_lesson.js.map