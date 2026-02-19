import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
export const deleteAnnouncementSchema = {
    announcementId: z.string().describe("The announcement ID to delete"),
};
export async function deleteAnnouncement(params) {
    const ref = db.collection(COLLECTION.ANNOUNCEMENTS).doc(params.announcementId);
    const doc = await ref.get();
    if (!doc.exists) {
        throw new Error(`Announcement not found: ${params.announcementId}`);
    }
    const data = doc.data();
    await ref.delete();
    return {
        announcementId: params.announcementId,
        title: data.title,
        message: `Announcement "${data.title}" deleted successfully`,
    };
}
//# sourceMappingURL=delete_announcement.js.map