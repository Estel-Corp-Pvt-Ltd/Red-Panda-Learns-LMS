import { z } from "zod";
export declare const deleteAnnouncementSchema: {
    announcementId: z.ZodString;
};
export declare function deleteAnnouncement(params: {
    announcementId: string;
}): Promise<{
    announcementId: string;
    title: any;
    message: string;
}>;
//# sourceMappingURL=delete_announcement.d.ts.map