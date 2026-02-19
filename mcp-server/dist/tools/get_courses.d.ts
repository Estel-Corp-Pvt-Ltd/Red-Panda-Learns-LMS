import { z } from "zod";
export declare const getCoursesSchema: {
    status: z.ZodOptional<z.ZodString>;
    instructorId: z.ZodOptional<z.ZodString>;
    pricingModel: z.ZodOptional<z.ZodString>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function getCourses(params: {
    status?: string;
    instructorId?: string;
    pricingModel?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
}): Promise<{
    courses: {
        id: string;
        title: any;
        slug: any;
        status: any;
        mode: any;
        pricingModel: any;
        regularPrice: any;
        salePrice: any;
        instructorId: any;
        instructorName: any;
        topicCount: any;
        createdAt: any;
    }[];
    count: number;
}>;
//# sourceMappingURL=get_courses.d.ts.map