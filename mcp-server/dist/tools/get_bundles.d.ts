import { z } from "zod";
export declare const getBundlesSchema: {
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "PUBLISHED", "ARCHIVED"]>>;
    pricingModel: z.ZodOptional<z.ZodEnum<["FREE", "PAID"]>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function getBundles(params: {
    status?: string;
    pricingModel?: string;
    limit?: number;
}): Promise<{
    bundles: {
        id: string;
        title: any;
        slug: any;
        description: any;
        courseCount: any;
        courses: any;
        regularPrice: any;
        salePrice: any;
        pricingModel: any;
        status: any;
        instructorName: any;
        createdAt: any;
    }[];
    count: number;
}>;
//# sourceMappingURL=get_bundles.d.ts.map