import { z } from "zod";
export declare const getCouponsSchema: {
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE", "EXPIRED"]>>;
    code: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function getCoupons(params: {
    status?: string;
    code?: string;
    limit?: number;
}): Promise<{
    coupons: {
        id: string;
        code: any;
        discountPercentage: any;
        expiryDate: any;
        usageLimit: any;
        totalUsed: any;
        currentUsageCount: any;
        status: any;
        linkedCourseIds: any;
        linkedBundleIds: any;
        createdAt: any;
    }[];
    count: number;
}>;
//# sourceMappingURL=get_coupons.d.ts.map