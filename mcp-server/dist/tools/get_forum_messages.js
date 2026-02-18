import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
export const getForumMessagesSchema = {
    channelId: z.string().describe("The forum channel ID to get messages from"),
    status: z.enum(["ACTIVE", "HIDDEN", "DELETED"]).optional().describe("Filter by message status"),
    limit: z.number().optional().default(50).describe("Maximum number of results (default 50)"),
};
export async function getForumMessages(params) {
    let query = db
        .collection(COLLECTION.CHANNEL_MESSAGES)
        .where("channelId", "==", params.channelId);
    if (params.status) {
        query = query.where("status", "==", params.status);
    }
    query = query.limit(params.limit ?? 50);
    const snapshot = await query.get();
    const messages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            senderId: data.senderId,
            senderName: data.senderName,
            senderRole: data.senderRole,
            text: data.text,
            status: data.status,
            upvoteCount: data.upvoteCount ?? 0,
            replyCount: data.replyCount ?? 0,
            replyTo: data.replyTo ?? null,
            isEdited: data.isEdited,
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        };
    });
    return { messages, count: messages.length };
}
//# sourceMappingURL=get_forum_messages.js.map