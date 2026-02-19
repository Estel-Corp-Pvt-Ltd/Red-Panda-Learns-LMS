import { z } from "zod";
export declare const deleteCouponSchema: {
    couponId: z.ZodString;
};
export declare function deleteCoupon(params: {
    couponId: string;
}): Promise<{
    couponId: string;
    code: any;
    message: string;
}>;
//# sourceMappingURL=delete_coupon.d.ts.map