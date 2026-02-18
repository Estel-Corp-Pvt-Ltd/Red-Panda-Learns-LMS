import { z } from "zod";
export declare const gradeSubmissionSchema: {
    submissionId: z.ZodString;
    marks: z.ZodNumber;
    feedback: z.ZodOptional<z.ZodString>;
};
export declare function gradeSubmission(params: {
    submissionId: string;
    marks: number;
    feedback?: string;
}): Promise<{
    submissionId: string;
    assignmentId: any;
    assignmentTitle: any;
    studentId: any;
    studentName: any;
    studentEmail: any;
    marks: number;
    feedback: any;
    message: string;
}>;
//# sourceMappingURL=grade_submission.d.ts.map