import { z } from "zod";
export declare const duplicateCourseSchema: {
    courseId: z.ZodString;
    newTitle: z.ZodOptional<z.ZodString>;
};
export declare function duplicateCourse(params: {
    courseId: string;
    newTitle?: string;
}): Promise<{
    newCourseId: string;
    newSlug: string;
    newTitle: string;
    sourceCourseId: string;
    sourceTitle: any;
    status: string;
    copiedTopics: any;
    copiedItems: any;
    message: string;
}>;
//# sourceMappingURL=duplicate_course.d.ts.map