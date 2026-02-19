import { z } from "zod";
export declare const dropEnrollmentSchema: {
    userId: z.ZodString;
    courseId: z.ZodString;
};
export declare function dropEnrollment(params: {
    userId: string;
    courseId: string;
}): Promise<{
    enrollmentId: string;
    userId: string;
    courseId: string;
    previousStatus: string;
    newStatus: string;
    message: string;
    userName?: undefined;
    userEmail?: undefined;
    courseName?: undefined;
} | {
    enrollmentId: string;
    userId: string;
    userName: any;
    userEmail: any;
    courseId: string;
    courseName: any;
    previousStatus: any;
    newStatus: string;
    message: string;
}>;
//# sourceMappingURL=drop_enrollment.d.ts.map