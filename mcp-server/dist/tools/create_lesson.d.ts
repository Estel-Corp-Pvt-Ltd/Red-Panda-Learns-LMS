import { z } from "zod";
export declare const createLessonSchema: {
    courseId: z.ZodString;
    topicId: z.ZodString;
    title: z.ZodString;
    type: z.ZodDefault<z.ZodOptional<z.ZodEnum<["SLIDE DECK", "VIDEO LECTURE", "INTERACTIVE PROJECT", "PDF", "MIRO BOARD", "TEXT", "ZOOM MEETING", "ZOOM RECORDED_LECTURE"]>>>;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    embedUrl: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    durationHours: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    durationMinutes: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function createLesson(params: {
    courseId: string;
    topicId: string;
    title: string;
    type?: string;
    description?: string;
    embedUrl?: string;
    durationHours?: number;
    durationMinutes?: number;
}): Promise<{
    lessonId: string;
    courseId: string;
    courseTitle: any;
    topicId: string;
    topicTitle: any;
    title: string;
    type: string;
    itemIndex: number;
    message: string;
}>;
//# sourceMappingURL=create_lesson.d.ts.map