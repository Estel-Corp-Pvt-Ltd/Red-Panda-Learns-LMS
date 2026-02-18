import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
export const updateAnnouncementSchema = {
    announcementId: z.string().describe("The announcement ID to update"),
    title: z.string().optional().describe("New title"),
    body: z.string().optional().describe("New body/content"),
    status: z.enum(["PUBLISHED", "DRAFT"]).optional().describe("New status"),
    targetClass: z.string().optional().describe("New target class"),
    targetDivision: z.string().optional().describe("New target division"),
};
export async function updateAnnouncement(params) {
    const ref = db.collection(COLLECTION.ANNOUNCEMENTS).doc(params.announcementId);
    const doc = await ref.get();
    if (!doc.exists) {
        throw new Error(`Announcement not found: ${params.announcementId}`);
    }
    const updates = { updatedAt: FieldValue.serverTimestamp() };
    if (params.title !== undefined)
        updates.title = params.title;
    if (params.body !== undefined)
        updates.body = params.body;
    if (params.status !== undefined)
        updates.status = params.status;
    if (params.targetClass !== undefined)
        updates.targetClass = params.targetClass;
    if (params.targetDivision !== undefined)
        updates.targetDivision = params.targetDivision;
    await ref.update(updates);
    return {
        announcementId: params.announcementId,
        updatedFields: Object.keys(updates).filter((k) => k !== "updatedAt"),
        message: `Announcement "${params.announcementId}" updated successfully`,
    };
}
//# sourceMappingURL=update_announcement.js.map