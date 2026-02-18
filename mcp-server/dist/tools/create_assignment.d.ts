import { z } from "zod";
export declare const createAssignmentSchema: {
    courseId: z.ZodString;
    topicId: z.ZodString;
    title: z.ZodString;
    content: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    totalPoints: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    minimumPassPoint: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    fileUploadLimit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maximumUploadSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    deadline: z.ZodOptional<z.ZodString>;
};
export declare function createAssignment(params: {
    courseId: string;
    topicId: string;
    title: string;
    content?: string;
    totalPoints?: number;
    minimumPassPoint?: number;
    fileUploadLimit?: number;
    maximumUploadSize?: number;
    deadline?: string;
}): Promise<{
    assignmentId: string;
    courseId: string;
    courseTitle: any;
    topicId: string;
    topicTitle: any;
    title: string;
    totalPoints: number;
    minimumPassPoint: number;
    message: string;
}>;
//# sourceMappingURL=create_assignment.d.ts.map