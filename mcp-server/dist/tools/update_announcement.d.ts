import { z } from "zod";
export declare const updateAnnouncementSchema: {
    announcementId: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    body: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["PUBLISHED", "DRAFT"]>>;
    targetClass: z.ZodOptional<z.ZodString>;
    targetDivision: z.ZodOptional<z.ZodString>;
};
export declare function updateAnnouncement(params: {
    announcementId: string;
    title?: string;
    body?: string;
    status?: string;
    targetClass?: string;
    targetDivision?: string;
}): Promise<{
    announcementId: string;
    updatedFields: string[];
    message: string;
}>;
//# sourceMappingURL=update_announcement.d.ts.map