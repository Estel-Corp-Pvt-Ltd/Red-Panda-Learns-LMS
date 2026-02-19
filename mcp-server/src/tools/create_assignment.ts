import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const createAssignmentSchema = {
  courseId: z.string().describe("The course ID this assignment belongs to"),
  topicId: z.string().describe("The topic ID within the course to add this assignment to"),
  title: z.string().describe("Assignment title"),
  content: z.string().optional().default("").describe("Assignment content/instructions (HTML supported)"),
  totalPoints: z.number().optional().default(100).describe("Total points for this assignment"),
  minimumPassPoint: z.number().optional().default(30).describe("Minimum points to pass"),
  fileUploadLimit: z.number().optional().default(5).describe("Max number of file uploads allowed"),
  maximumUploadSize: z.number().optional().default(10).describe("Max upload size in MB"),
  deadline: z.string().optional().describe("Deadline as ISO date string (e.g. 2026-03-01T23:59:59Z)"),
};

/**
 * Generates a unique assignment ID using the Counters collection.
 * Format: assignment_<number>, starting from 60000000 with random 5-20 gaps.
 */
async function generateAssignmentId(): Promise<string> {
  const counterRef = db.collection(COLLECTION.COUNTERS).doc("assignmentCounter");

  const newId = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let lastNumber = 60000000;
    if (counterDoc.exists) {
      lastNumber = counterDoc.data()?.lastNumber ?? 60000000;
    }

    const gap = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
    const nextNumber = lastNumber + gap;
    transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });

    return nextNumber;
  });

  return `assignment_${newId}`;
}

export async function createAssignment(params: {
  courseId: string;
  topicId: string;
  title: string;
  content?: string;
  totalPoints?: number;
  minimumPassPoint?: number;
  fileUploadLimit?: number;
  maximumUploadSize?: number;
  deadline?: string;
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

  const assignmentId = await generateAssignmentId();

  const assignment = {
    id: assignmentId,
    title: params.title,
    content: params.content ?? "",
    courseId: params.courseId,
    attachments: [],
    deadline: params.deadline ? new Date(params.deadline) : null,
    fileUploadLimit: params.fileUploadLimit ?? 5,
    maximumUploadSize: params.maximumUploadSize ?? 10,
    totalPoints: params.totalPoints ?? 100,
    minimumPassPoint: params.minimumPassPoint ?? 30,
    authorId: "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Create assignment document
  await db.collection(COLLECTION.ASSIGNMENTS).doc(assignmentId).set(assignment);

  // Add assignment reference to course topic items
  const topicItem = {
    id: assignmentId,
    type: "ASSIGNMENT",
    title: params.title,
  };

  topics[topicIndex].items = topics[topicIndex].items || [];
  topics[topicIndex].items.push(topicItem);

  await courseRef.update({
    topics,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    assignmentId,
    courseId: params.courseId,
    courseTitle: courseData.title,
    topicId: params.topicId,
    topicTitle: topics[topicIndex].title,
    title: params.title,
    totalPoints: assignment.totalPoints,
    minimumPassPoint: assignment.minimumPassPoint,
    message: `Assignment "${params.title}" created and added to topic "${topics[topicIndex].title}"`,
  };
}
