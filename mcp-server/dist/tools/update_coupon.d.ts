import { z } from "zod";
export declare const updateCouponSchema: {
    couponId: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    discountPercentage: z.ZodOptional<z.ZodNumber>;
    expiryDate: z.ZodOptional<z.ZodString>;
    usageLimit: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE"]>>;
    linkedCourseIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    linkedBundleIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
};
export declare function updateCoupon(params: {
    couponId: string;
    code?: string;
    discountPercentage?: number;
    expiryDate?: string;
    usageLimit?: number;
    status?: string;
    linkedCourseIds?: string[];
    linkedBundleIds?: string[];
}): Promise<{
    couponId: string;
    updatedFields: string[];
    message: string;
}>;
//# sourceMappingURL=update_coupon.d.ts.map