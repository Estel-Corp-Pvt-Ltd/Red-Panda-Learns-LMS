import { z } from "zod";
export declare const getLearningProgressSchema: {
    userId: z.ZodOptional<z.ZodString>;
    courseId: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function getLearningProgress(params: {
    userId?: string;
    courseId?: string;
    limit?: number;
}): Promise<{
    progress: never[];
    count: number;
    message: string;
} | {
    progress: {
        id: string;
        userId: any;
        courseId: any;
        completedLessons: any;
        completedAssignments: any;
        completedLessonCount: any;
        completedAssignmentCount: any;
        lastAccessedLesson: any;
        totalTimeSpent: any;
        updatedAt: any;
    }[];
    count: number;
    message?: undefined;
} | {
    progress: {
        id: string;
        userId: any;
        courseId: any;
        completedLessonCount: any;
        completedAssignmentCount: any;
        lastAccessedLesson: any;
        totalTimeSpent: any;
        updatedAt: any;
    }[];
    count: number;
    message?: undefined;
}>;
//# sourceMappingURL=get_learning_progress.d.ts.map