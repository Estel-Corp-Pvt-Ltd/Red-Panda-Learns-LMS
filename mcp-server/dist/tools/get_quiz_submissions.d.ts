import { z } from "zod";
export declare const getQuizSubmissionsSchema: {
    quizId: z.ZodString;
    status: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function getQuizSubmissions(params: {
    quizId: string;
    status?: string;
    limit?: number;
}): Promise<{
    quizId: string;
    quizTitle: any;
    totalMarks: any;
    passingPercentage: any;
    totalCount: number;
    limit: number;
    summary: {
        submitted: number;
        inProgress: number;
        passed: number;
        failed: number;
        averageScore: number;
    };
    submissions: {
        id: string;
        quizId: any;
        userId: any;
        userName: any;
        userEmail: any;
        status: any;
        totalScore: any;
        passed: any;
        answersCount: any;
        startedAt: any;
        submittedAt: any;
        lastSavedAt: any;
    }[];
}>;
//# sourceMappingURL=get_quiz_submissions.d.ts.map