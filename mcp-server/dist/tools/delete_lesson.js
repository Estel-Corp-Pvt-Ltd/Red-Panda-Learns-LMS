import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
export const deleteLessonSchema = {
    lessonId: z.string().describe("The lesson ID to delete (e.g. lesson_30001234)"),
};
export async function deleteLesson(params) {
    const lessonRef = db.collection(COLLECTION.LESSONS).doc(params.lessonId);
    const lessonDoc = await lessonRef.get();
    if (!lessonDoc.exists) {
        throw new Error(`Lesson not found: ${params.lessonId}`);
    }
    const data = lessonDoc.data();
    const courseId = data.courseId;
    const lessonTitle = data.title;
    // Delete the lesson document
    await lessonRef.delete();
    // Remove lesson reference from course topic items
    if (courseId) {
        const courseRef = db.collection(COLLECTION.COURSES).doc(courseId);
        const courseDoc = await courseRef.get();
        if (courseDoc.exists) {
            const courseData = courseDoc.data();
            const topics = courseData.topics || [];
            let removed = false;
            for (const topic of topics) {
                if (!topic.items)
                    continue;
                const idx = topic.items.findIndex((item) => item.id === params.lessonId);
                if (idx !== -1) {
                    topic.items.splice(idx, 1);
                    removed = true;
                    break;
                }
            }
            if (removed) {
                await courseRef.update({
                    topics,
                    updatedAt: FieldValue.serverTimestamp(),
                });
            }
        }
    }
    // Also delete associated attachments
    const attachmentSnap = await db
        .collection(COLLECTION.LESSON_ATTACHMENTS)
        .where("lessonId", "==", params.lessonId)
        .get();
    if (!attachmentSnap.empty) {
        const batch = db.batch();
        attachmentSnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
    }
    return {
        lessonId: params.lessonId,
        courseId,
        title: lessonTitle,
        attachmentsDeleted: attachmentSnap.size,
        message: `Lesson "${lessonTitle}" deleted and removed from course curriculum`,
    };
}
//# sourceMappingURL=delete_lesson.js.map