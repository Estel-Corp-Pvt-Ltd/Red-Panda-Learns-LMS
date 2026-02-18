import { z } from "zod";
export declare const getSubmissionsSchema: {
    assignmentId: z.ZodOptional<z.ZodString>;
    studentId: z.ZodOptional<z.ZodString>;
    courseId: z.ZodOptional<z.ZodString>;
    ungradedOnly: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function getSubmissions(params: {
    assignmentId?: string;
    studentId?: string;
    courseId?: string;
    ungradedOnly?: boolean;
    limit?: number;
}): Promise<{
    totalCount: number;
    limit: number;
    submissions: {
        id: string;
        assignmentId: any;
        assignmentTitle: any;
        courseId: any;
        studentId: any;
        studentName: any;
        studentEmail: any;
        marks: any;
        feedback: any;
        submissionFiles: any;
        textSubmissions: any;
        links: any;
        createdAt: any;
        updatedAt: any;
    }[];
}>;
//# sourceMappingURL=get_submissions.d.ts.map