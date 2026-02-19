import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";

export const deleteCouponSchema = {
  couponId: z.string().describe("The coupon ID to delete (e.g. coupon_70001234)"),
};

export async function deleteCoupon(params: { couponId: string }) {
  const couponRef = db.collection(COLLECTION.COUPONS).doc(params.couponId);
  const couponDoc = await couponRef.get();

  if (!couponDoc.exists) {
    throw new Error(`Coupon not found: ${params.couponId}`);
  }

  const data = couponDoc.data()!;
  await couponRef.delete();

  return {
    couponId: params.couponId,
    code: data.code,
    message: `Coupon "${data.code}" deleted successfully`,
  };
}
