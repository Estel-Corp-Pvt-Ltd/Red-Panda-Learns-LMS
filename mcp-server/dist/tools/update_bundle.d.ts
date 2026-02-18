import { z } from "zod";
export declare const updateBundleSchema: {
    bundleId: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    salePrice: z.ZodOptional<z.ZodNumber>;
    regularPrice: z.ZodOptional<z.ZodNumber>;
    pricingModel: z.ZodOptional<z.ZodEnum<["FREE", "PAID"]>>;
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "PUBLISHED", "ARCHIVED"]>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    thumbnail: z.ZodOptional<z.ZodString>;
    instructorId: z.ZodOptional<z.ZodString>;
    instructorName: z.ZodOptional<z.ZodString>;
};
export declare function updateBundle(params: {
    bundleId: string;
    title?: string;
    description?: string;
    slug?: string;
    salePrice?: number;
    regularPrice?: number;
    pricingModel?: string;
    status?: string;
    tags?: string[];
    thumbnail?: string;
    instructorId?: string;
    instructorName?: string;
}): Promise<{
    bundleId: string;
    updatedFields: string[];
    message: string;
}>;
//# sourceMappingURL=update_bundle.d.ts.map