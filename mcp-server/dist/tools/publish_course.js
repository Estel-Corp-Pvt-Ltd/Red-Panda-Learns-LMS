import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
export const publishCourseSchema = {
    courseId: z.string().describe("The course ID to publish (e.g. course_20001234)"),
};
export async function publishCourse(params) {
    const courseRef = db.collection(COLLECTION.COURSES).doc(params.courseId);
    const courseDoc = await courseRef.get();
    if (!courseDoc.exists) {
        throw new Error(`Course not found: ${params.courseId}`);
    }
    const data = courseDoc.data();
    if (data.status === "PUBLISHED") {
        return {
            courseId: params.courseId,
            title: data.title,
            status: "PUBLISHED",
            message: `Course "${data.title}" is already published`,
        };
    }
    // Validate: course must have at least 1 topic with 1 item
    const topics = data.topics || [];
    const hasContent = topics.some((t) => t.items && t.items.length > 0);
    if (topics.length === 0 || !hasContent) {
        throw new Error(`Cannot publish course "${data.title}": it must have at least 1 topic with 1 lesson or assignment`);
    }
    await courseRef.update({
        status: "PUBLISHED",
        updatedAt: FieldValue.serverTimestamp(),
    });
    return {
        courseId: params.courseId,
        title: data.title,
        previousStatus: data.status,
        status: "PUBLISHED",
        topicCount: topics.length,
        message: `Course "${data.title}" published successfully`,
    };
}
//# sourceMappingURL=publish_course.js.map