import { z } from "zod";
export declare const deleteLessonSchema: {
    lessonId: z.ZodString;
};
export declare function deleteLesson(params: {
    lessonId: string;
}): Promise<{
    lessonId: string;
    courseId: any;
    title: any;
    attachmentsDeleted: number;
    message: string;
}>;
//# sourceMappingURL=delete_lesson.d.ts.map