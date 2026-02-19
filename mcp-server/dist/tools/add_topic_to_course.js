import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
export const addTopicToCourseSchema = {
    courseId: z.string().describe("The course ID to add the topic to (e.g. course_20001234)"),
    title: z.string().describe("Topic/section title"),
};
export async function addTopicToCourse(params) {
    const courseRef = db.collection(COLLECTION.COURSES).doc(params.courseId);
    const courseDoc = await courseRef.get();
    if (!courseDoc.exists) {
        throw new Error(`Course not found: ${params.courseId}`);
    }
    const data = courseDoc.data();
    const topics = data.topics || [];
    const topicId = `topic_${Date.now()}`;
    const newTopic = {
        id: topicId,
        title: params.title,
        items: [],
    };
    topics.push(newTopic);
    await courseRef.update({
        topics,
        updatedAt: FieldValue.serverTimestamp(),
    });
    return {
        courseId: params.courseId,
        courseTitle: data.title,
        topicId,
        topicTitle: params.title,
        topicIndex: topics.length - 1,
        totalTopics: topics.length,
        message: `Topic "${params.title}" added to course "${data.title}"`,
    };
}
//# sourceMappingURL=add_topic_to_course.js.map