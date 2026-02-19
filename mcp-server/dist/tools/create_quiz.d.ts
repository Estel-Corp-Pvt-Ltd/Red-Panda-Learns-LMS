import { z } from "zod";
export declare const createQuizSchema: {
    courseId: z.ZodString;
    title: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    passingPercentage: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    durationMinutes: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    scheduledAt: z.ZodString;
    endAt: z.ZodString;
    enableFreeNavigation: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    allowAllStudents: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["DRAFT", "PUBLISHED"]>>>;
};
export declare function createQuiz(params: {
    courseId: string;
    title: string;
    description?: string;
    passingPercentage?: number;
    durationMinutes?: number;
    scheduledAt: string;
    endAt: string;
    enableFreeNavigation?: boolean;
    allowAllStudents?: boolean;
    status?: "DRAFT" | "PUBLISHED";
}): Promise<{
    quizId: string;
    courseId: string;
    courseTitle: any;
    title: string;
    status: "DRAFT" | "PUBLISHED";
    scheduledAt: string;
    endAt: string;
    durationMinutes: number;
    passingPercentage: number;
    message: string;
}>;
//# sourceMappingURL=create_quiz.d.ts.map