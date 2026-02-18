import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const createForumChannelSchema = {
  courseId: z.string().describe("The course ID this forum channel belongs to"),
  name: z.string().describe("Channel name (required)"),
  description: z.string().optional().default("").describe("Channel description"),
  order: z.number().optional().default(0).describe("Display order (lower = first)"),
  isModerated: z.boolean().optional().default(false).describe("If true, student messages are hidden until approved"),
  createdBy: z.string().optional().default("admin").describe("Creator user ID"),
};

export async function createForumChannel(params: {
  courseId: string;
  name: string;
  description?: string;
  order?: number;
  isModerated?: boolean;
  createdBy?: string;
}) {
  // Verify course exists
  const courseDoc = await db.collection(COLLECTION.COURSES).doc(params.courseId).get();
  if (!courseDoc.exists) {
    throw new Error(`Course not found: ${params.courseId}`);
  }

  const docRef = db.collection(COLLECTION.FORUM_CHANNELS).doc();

  const channel = {
    id: docRef.id,
    name: params.name,
    description: params.description ?? "",
    order: params.order ?? 0,
    courseId: params.courseId,
    createdBy: params.createdBy ?? "admin",
    isArchived: false,
    isModerated: params.isModerated ?? false,
    createdAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(channel);

  return {
    channelId: docRef.id,
    name: params.name,
    courseId: params.courseId,
    isModerated: channel.isModerated,
    message: `Forum channel "${params.name}" created for course "${courseDoc.data()!.title}"`,
  };
}
