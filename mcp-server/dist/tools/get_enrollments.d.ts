import { z } from "zod";
export declare const getEnrollmentsSchema: {
    userId: z.ZodOptional<z.ZodString>;
    courseId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function getEnrollments(params: {
    userId?: string;
    courseId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
}): Promise<{
    enrollments: {
        id: string;
        userId: any;
        userName: any;
        userEmail: any;
        courseId: any;
        courseName: any;
        status: any;
        orderId: any;
        enrollmentDate: any;
        completionDate: any;
    }[];
    count: number;
}>;
//# sourceMappingURL=get_enrollments.d.ts.map