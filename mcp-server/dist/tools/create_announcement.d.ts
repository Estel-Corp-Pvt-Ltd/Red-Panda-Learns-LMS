import { z } from "zod";
export declare const createAnnouncementSchema: {
    title: z.ZodString;
    body: z.ZodString;
    scope: z.ZodDefault<z.ZodOptional<z.ZodEnum<["GLOBAL", "COURSE", "ORGANIZATION"]>>>;
    courseId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["PUBLISHED", "DRAFT"]>>>;
    createdBy: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    targetClass: z.ZodOptional<z.ZodString>;
    targetDivision: z.ZodOptional<z.ZodString>;
};
export declare function createAnnouncement(params: {
    title: string;
    body: string;
    scope?: string;
    courseId?: string;
    organizationId?: string;
    status?: string;
    createdBy?: string;
    targetClass?: string;
    targetDivision?: string;
}): Promise<{
    announcementId: string;
    title: string;
    scope: string;
    status: any;
    message: string;
}>;
//# sourceMappingURL=create_announcement.d.ts.map