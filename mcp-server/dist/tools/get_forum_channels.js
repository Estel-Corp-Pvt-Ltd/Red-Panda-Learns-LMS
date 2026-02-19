import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
export const getForumChannelsSchema = {
    courseId: z.string().describe("The course ID to get forum channels for"),
    includeArchived: z.boolean().optional().default(false).describe("Include archived channels"),
};
export async function getForumChannels(params) {
    let query = db
        .collection(COLLECTION.FORUM_CHANNELS)
        .where("courseId", "==", params.courseId);
    if (!params.includeArchived) {
        query = query.where("isArchived", "==", false);
    }
    const snapshot = await query.get();
    const channels = snapshot.docs
        .map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            description: data.description,
            order: data.order ?? 0,
            courseId: data.courseId,
            isArchived: data.isArchived,
            isModerated: data.isModerated,
            createdBy: data.createdBy,
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        };
    })
        .sort((a, b) => a.order - b.order);
    return { channels, count: channels.length };
}
//# sourceMappingURL=get_forum_channels.js.map