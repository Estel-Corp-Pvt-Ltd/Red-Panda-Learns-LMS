import { z } from "zod";
export declare const createCouponSchema: {
    code: z.ZodString;
    discountPercentage: z.ZodNumber;
    expiryDate: z.ZodString;
    usageLimit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    linkedCourseIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    linkedBundleIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    linkedCohortIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    createdById: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    createdByEmail: z.ZodDefault<z.ZodOptional<z.ZodString>>;
};
export declare function createCoupon(params: {
    code: string;
    discountPercentage: number;
    expiryDate: string;
    usageLimit?: number;
    linkedCourseIds?: string[];
    linkedBundleIds?: string[];
    linkedCohortIds?: string[];
    createdById?: string;
    createdByEmail?: string;
}): Promise<{
    couponId: string;
    code: string;
    discountPercentage: number;
    expiryDate: string;
    usageLimit: number;
    status: string;
    message: string;
}>;
//# sourceMappingURL=create_coupon.d.ts.map