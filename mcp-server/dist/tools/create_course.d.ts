import { z } from "zod";
export declare const createCourseSchema: {
    title: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    slug: z.ZodOptional<z.ZodString>;
    instructorId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    instructorName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    pricingModel: z.ZodDefault<z.ZodOptional<z.ZodEnum<["FREE", "PAID"]>>>;
    regularPrice: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    salePrice: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    mode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["LIVE", "SELF-PACED"]>>>;
};
export declare function createCourse(params: {
    title: string;
    description?: string;
    slug?: string;
    instructorId?: string;
    instructorName?: string;
    pricingModel?: "FREE" | "PAID";
    regularPrice?: number;
    salePrice?: number;
    mode?: "LIVE" | "SELF-PACED";
}): Promise<{
    courseId: string;
    title: string;
    slug: string;
    status: string;
    pricingModel: "FREE" | "PAID";
    regularPrice: number;
    salePrice: number;
    mode: "LIVE" | "SELF-PACED";
    instructorName: string;
    message: string;
}>;
//# sourceMappingURL=create_course.d.ts.map