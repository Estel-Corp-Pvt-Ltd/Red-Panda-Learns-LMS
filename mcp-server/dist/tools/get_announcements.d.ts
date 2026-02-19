import { z } from "zod";
export declare const getAnnouncementsSchema: {
    scope: z.ZodOptional<z.ZodEnum<["GLOBAL", "COURSE", "ORGANIZATION"]>>;
    courseId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["PUBLISHED", "DRAFT"]>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function getAnnouncements(params: {
    scope?: string;
    courseId?: string;
    organizationId?: string;
    status?: string;
    limit?: number;
}): Promise<{
    announcements: {
        id: string;
        title: any;
        body: any;
        scope: any;
        courseId: any;
        organizationId: any;
        status: any;
        createdBy: any;
        createdAt: any;
    }[];
    count: number;
}>;
//# sourceMappingURL=get_announcements.d.ts.map