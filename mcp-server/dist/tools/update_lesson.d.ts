import { z } from "zod";
export declare const updateLessonSchema: {
    lessonId: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["SLIDE DECK", "VIDEO LECTURE", "INTERACTIVE PROJECT", "PDF", "MIRO BOARD", "TEXT", "ZOOM MEETING", "ZOOM RECORDED_LECTURE"]>>;
    description: z.ZodOptional<z.ZodString>;
    embedUrl: z.ZodOptional<z.ZodString>;
    durationHours: z.ZodOptional<z.ZodNumber>;
    durationMinutes: z.ZodOptional<z.ZodNumber>;
};
export declare function updateLesson(params: {
    lessonId: string;
    title?: string;
    type?: string;
    description?: string;
    embedUrl?: string;
    durationHours?: number;
    durationMinutes?: number;
}): Promise<{
    lessonId: string;
    message: string;
    updatedFields: never[];
    courseId?: undefined;
} | {
    lessonId: string;
    courseId: any;
    updatedFields: string[];
    message: string;
}>;
//# sourceMappingURL=update_lesson.d.ts.map