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
] as const;

export const createLessonSchema = {
  courseId: z.string().describe("The course ID this lesson belongs to"),
  topicId: z.string().describe("The topic ID within the course to add this lesson to"),
  title: z.string().describe("Lesson title"),
  type: z
    .enum(LESSON_TYPES)
    .optional()
    .default("VIDEO LECTURE")
    .describe("Lesson type: SLIDE DECK, VIDEO LECTURE, INTERACTIVE PROJECT, PDF, MIRO BOARD, TEXT, ZOOM MEETING, ZOOM RECORDED_LECTURE"),
  description: z.string().optional().default("").describe("Lesson description (HTML supported)"),
  embedUrl: z.string().optional().default("").describe("Embed URL for video/slides/etc"),
  durationHours: z.number().optional().default(0).describe("Lesson duration hours"),
  durationMinutes: z.number().optional().default(0).describe("Lesson duration minutes"),
};

/**
 * Generates a unique lesson ID using the Counters collection.
 * Format: lesson_<number>, starting from 30000000 with random 10-50 gaps.
 */
async function generateLessonId(): Promise<string> {
  const counterRef = db.collection(COLLECTION.COUNTERS).doc("lessonCounter");

  const newId = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let lastNumber = 30000000;
    if (counterDoc.exists) {
      lastNumber = counterDoc.data()?.lastNumber ?? 30000000;
    }

    const gap = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
    const nextNumber = lastNumber + gap;
    transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });

    return nextNumber;
  });

  return `lesson_${newId}`;
}

export async function createLesson(params: {
  courseId: string;
  topicId: string;
  title: string;
  type?: string;
  description?: string;
  embedUrl?: string;
  durationHours?: number;
  durationMinutes?: number;
}) {
  // Verify course exists and find the topic
  const courseRef = db.collection(COLLECTION.COURSES).doc(params.courseId);
  const courseDoc = await courseRef.get();

  if (!courseDoc.exists) {
    throw new Error(`Course not found: ${params.courseId}`);
  }

  const courseData = courseDoc.data()!;
  const topics = courseData.topics || [];
  const topicIndex = topics.findIndex((t: any) => t.id === params.topicId);

  if (topicIndex === -1) {
    throw new Error(`Topic not found: ${params.topicId} in course ${params.courseId}`);
  }

  // Generate lesson ID and create lesson document
  const lessonId = await generateLessonId();

  const lesson = {
    id: lessonId,
    courseId: params.courseId,
    title: params.title,
    type: params.type ?? "VIDEO LECTURE",
    description: params.description ?? "",
    embedUrl: params.embedUrl ?? "",
    duration: {
      hours: params.durationHours ?? 0,
      minutes: params.durationMinutes ?? 0,
    },
    karmaBoostExpiresAfter: {
      hours: 0,
      minutes: 0,
    },
    durationAddedtoLearningProgress: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Create lesson document in Lessons collection
  await db.collection(COLLECTION.LESSONS).doc(lessonId).set(lesson);

  // Add lesson reference to course topic items
  const topicItem = {
    id: lessonId,
    type: "LESSON",
    title: params.title,
  };

  topics[topicIndex].items = topics[topicIndex].items || [];
  topics[topicIndex].items.push(topicItem);

  await courseRef.update({
    topics,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    lessonId,
    courseId: params.courseId,
    courseTitle: courseData.title,
    topicId: params.topicId,
    topicTitle: topics[topicIndex].title,
    title: params.title,
    type: lesson.type,
    itemIndex: topics[topicIndex].items.length - 1,
    message: `Lesson "${params.title}" created and added to topic "${topics[topicIndex].title}"`,
  };
}
