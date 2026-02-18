import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const updateCouponSchema = {
  couponId: z.string().describe("The coupon ID to update (e.g. coupon_70001234)"),
  code: z.string().optional().describe("New coupon code"),
  discountPercentage: z.number().optional().describe("New discount percentage (1-100)"),
  expiryDate: z.string().optional().describe("New expiry date as ISO string"),
  usageLimit: z.number().optional().describe("New usage limit"),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().describe("New status"),
  linkedCourseIds: z.array(z.string()).optional().describe("New linked course IDs"),
  linkedBundleIds: z.array(z.string()).optional().describe("New linked bundle IDs"),
};

export async function updateCoupon(params: {
  couponId: string;
  code?: string;
  discountPercentage?: number;
  expiryDate?: string;
  usageLimit?: number;
  status?: string;
  linkedCourseIds?: string[];
  linkedBundleIds?: string[];
}) {
  const couponRef = db.collection(COLLECTION.COUPONS).doc(params.couponId);
  const couponDoc = await couponRef.get();

  if (!couponDoc.exists) {
    throw new Error(`Coupon not found: ${params.couponId}`);
  }

  const updates: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };

  if (params.code !== undefined) updates.code = params.code.toUpperCase();
  if (params.discountPercentage !== undefined) {
    if (params.discountPercentage < 1 || params.discountPercentage > 100) {
      throw new Error("Discount percentage must be between 1 and 100");
    }
    updates.discountPercentage = params.discountPercentage;
  }
  if (params.expiryDate !== undefined) updates.expiryDate = new Date(params.expiryDate);
  if (params.usageLimit !== undefined) updates.usageLimit = params.usageLimit;
  if (params.status !== undefined) updates.status = params.status;
  if (params.linkedCourseIds !== undefined) updates.linkedCourseIds = params.linkedCourseIds;
  if (params.linkedBundleIds !== undefined) updates.linkedBundleIds = params.linkedBundleIds;

  await couponRef.update(updates);

  return {
    couponId: params.couponId,
    updatedFields: Object.keys(updates).filter((k) => k !== "updatedAt"),
    message: `Coupon "${params.couponId}" updated successfully`,
  };
}
