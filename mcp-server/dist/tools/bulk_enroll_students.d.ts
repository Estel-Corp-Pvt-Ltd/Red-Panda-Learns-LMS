import { z } from "zod";
export declare const bulkEnrollStudentsSchema: {
    courseId: z.ZodString;
    emails: z.ZodArray<z.ZodString, "many">;
};
export declare function bulkEnrollStudents(params: {
    courseId: string;
    emails: string[];
}): Promise<{
    courseId: string;
    courseName: any;
    summary: {
        totalRequested: number;
        enrolled: number;
        alreadyEnrolled: number;
        notFound: number;
        errors: number;
    };
    enrolled: {
        email: string;
        userId: string;
        userName: string;
    }[];
    alreadyEnrolled: {
        email: string;
        userId: string;
    }[];
    notFound: string[];
    errors: {
        email: string;
        error: string;
    }[];
    message: string;
}>;
//# sourceMappingURL=bulk_enroll_students.d.ts.map