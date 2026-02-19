import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
export const createForumMessageSchema = {
    channelId: z.string().describe("The forum channel ID to post in"),
    courseId: z.string().describe("The course ID this message belongs to"),
    senderId: z.string().describe("The user ID of the sender"),
    senderName: z.string().describe("Display name of the sender"),
    senderRole: z
        .enum(["STUDENT", "TEACHER", "INSTRUCTOR", "ADMIN"])
        .optional()
        .default("ADMIN")
        .describe("Role of the sender"),
    text: z.string().describe("Message text content"),
    replyTo: z.string().optional().describe("Parent message ID (for threaded replies)"),
};
export async function createForumMessage(params) {
    // Verify channel exists
    const channelDoc = await db.collection(COLLECTION.FORUM_CHANNELS).doc(params.channelId).get();
    if (!channelDoc.exists) {
        throw new Error(`Forum channel not found: ${params.channelId}`);
    }
    const channelData = channelDoc.data();
    const senderRole = params.senderRole ?? "ADMIN";
    const isPrivileged = senderRole === "ADMIN" || senderRole === "INSTRUCTOR";
    // Determine status based on moderation
    const status = channelData.isModerated && !isPrivileged ? "HIDDEN" : "ACTIVE";
    const docRef = db.collection(COLLECTION.CHANNEL_MESSAGES).doc();
    const message = {
        id: docRef.id,
        channelId: params.channelId,
        courseId: params.courseId,
        senderId: params.senderId,
        senderName: params.senderName,
        senderRole,
        text: params.text,
        attachments: [],
        isEdited: false,
        status,
        upvoteCount: 0,
        replyCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };
    if (params.replyTo) {
        message.replyTo = params.replyTo;
    }
    await docRef.set(message);
    // Increment parent reply count if this is a reply
    if (params.replyTo) {
        const parentRef = db.collection(COLLECTION.CHANNEL_MESSAGES).doc(params.replyTo);
        await parentRef.update({ replyCount: FieldValue.increment(1) });
    }
    return {
        messageId: docRef.id,
        channelId: params.channelId,
        senderName: params.senderName,
        status,
        isReply: !!params.replyTo,
        message: `Message posted in channel "${channelData.name}"${status === "HIDDEN" ? " (pending moderation)" : ""}`,
    };
}
//# sourceMappingURL=create_forum_message.js.map