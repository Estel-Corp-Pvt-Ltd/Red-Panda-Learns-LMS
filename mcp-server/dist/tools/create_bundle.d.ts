import { z } from "zod";
export declare const createBundleSchema: {
    title: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    courseIds: z.ZodArray<z.ZodString, "many">;
    slug: z.ZodOptional<z.ZodString>;
    pricingModel: z.ZodDefault<z.ZodOptional<z.ZodEnum<["FREE", "PAID"]>>>;
    salePrice: z.ZodOptional<z.ZodNumber>;
    instructorId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    instructorName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    mode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["LIVE", "SELF-PACED"]>>>;
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
};
export declare function createBundle(params: {
    title: string;
    description?: string;
    courseIds: string[];
    slug?: string;
    pricingModel?: "FREE" | "PAID";
    salePrice?: number;
    instructorId?: string;
    instructorName?: string;
    mode?: "LIVE" | "SELF-PACED";
    tags?: string[];
}): Promise<{
    bundleId: string;
    title: string;
    slug: string;
    courseCount: number;
    regularPrice: number;
    salePrice: number;
    status: string;
    message: string;
}>;
//# sourceMappingURL=create_bundle.d.ts.map