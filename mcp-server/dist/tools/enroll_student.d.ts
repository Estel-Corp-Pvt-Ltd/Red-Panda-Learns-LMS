import { z } from "zod";
export declare const enrollStudentSchema: {
    courseId: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    userEmail: z.ZodOptional<z.ZodString>;
};
export declare function enrollStudent(params: {
    courseId: string;
    userId?: string;
    userEmail?: string;
}): Promise<{
    enrollmentId: string;
    userId: string | undefined;
    userName: string;
    userEmail: string;
    courseId: string;
    courseName: any;
    status: string;
    message: string;
    alreadyEnrolled: boolean;
}>;
//# sourceMappingURL=enroll_student.d.ts.map