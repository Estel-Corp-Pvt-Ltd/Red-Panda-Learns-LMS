import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
export const getCourseCurriculumSchema = {
    courseId: z.string().describe("The course ID to get curriculum for"),
};
export async function getCourseCurriculum(params) {
    const courseDoc = await db.collection(COLLECTION.COURSES).doc(params.courseId).get();
    if (!courseDoc.exists) {
        throw new Error(`Course not found: ${params.courseId}`);
    }
    const courseData = courseDoc.data();
    const topics = courseData.topics || [];
    // Collect all lesson and assignment IDs
    const lessonIds = [];
    const assignmentIds = [];
    for (const topic of topics) {
        for (const item of topic.items || []) {
            if (item.type === "LESSON") {
                lessonIds.push(item.id);
            }
            else if (item.type === "ASSIGNMENT") {
                assignmentIds.push(item.id);
            }
        }
    }
    // Fetch lesson details in chunks of 10
    const lessonMap = new Map();
    for (let i = 0; i < lessonIds.length; i += 10) {
        const chunk = lessonIds.slice(i, i + 10);
        const snap = await db
            .collection(COLLECTION.LESSONS)
            .where("id", "in", chunk)
            .get();
        for (const doc of snap.docs) {
            const d = doc.data();
            lessonMap.set(doc.id, {
                id: doc.id,
                title: d.title,
                type: d.type,
                duration: d.duration || { hours: 0, minutes: 0 },
                embedUrl: d.embedUrl || "",
                description: d.description ? d.description.substring(0, 200) : "",
            });
        }
    }
    // Fetch assignment details in chunks of 10
    const assignmentMap = new Map();
    for (let i = 0; i < assignmentIds.length; i += 10) {
        const chunk = assignmentIds.slice(i, i + 10);
        const snap = await db
            .collection(COLLECTION.ASSIGNMENTS)
            .where("id", "in", chunk)
            .get();
        for (const doc of snap.docs) {
            const d = doc.data();
            assignmentMap.set(doc.id, {
                id: doc.id,
                title: d.title,
                totalPoints: d.totalPoints,
                minimumPassPoint: d.minimumPassPoint,
                deadline: d.deadline?.toDate?.()?.toISOString() ?? null,
            });
        }
    }
    // Build enriched curriculum structure
    const curriculum = topics.map((topic, idx) => ({
        topicIndex: idx,
        topicId: topic.id,
        topicTitle: topic.title,
        items: (topic.items || []).map((item) => {
            if (item.type === "LESSON") {
                const detail = lessonMap.get(item.id);
                return {
                    id: item.id,
                    type: "LESSON",
                    title: item.title,
                    ...(detail || {}),
                };
            }
            else if (item.type === "ASSIGNMENT") {
                const detail = assignmentMap.get(item.id);
                return {
                    id: item.id,
                    type: "ASSIGNMENT",
                    title: item.title,
                    ...(detail || {}),
                };
            }
            return item;
        }),
        itemCount: (topic.items || []).length,
    }));
    // Calculate totals
    let totalLessons = 0;
    let totalAssignments = 0;
    let totalDurationMinutes = 0;
    for (const topic of curriculum) {
        for (const item of topic.items) {
            if (item.type === "LESSON") {
                totalLessons++;
                if (item.duration) {
                    totalDurationMinutes += (item.duration.hours || 0) * 60 + (item.duration.minutes || 0);
                }
            }
            else if (item.type === "ASSIGNMENT") {
                totalAssignments++;
            }
        }
    }
    return {
        courseId: params.courseId,
        courseTitle: courseData.title,
        status: courseData.status,
        totalTopics: topics.length,
        totalLessons,
        totalAssignments,
        totalDuration: {
            hours: Math.floor(totalDurationMinutes / 60),
            minutes: totalDurationMinutes % 60,
        },
        curriculum,
    };
}
//# sourceMappingURL=get_course_curriculum.js.map