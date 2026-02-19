import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const createCouponSchema = {
  code: z.string().describe("Coupon code (unique, e.g. 'SUMMER25')"),
  discountPercentage: z.number().describe("Discount percentage (1-100)"),
  expiryDate: z.string().describe("Expiry date as ISO string (e.g. 2026-12-31T23:59:59Z)"),
  usageLimit: z.number().optional().default(100).describe("Maximum number of times this coupon can be used"),
  linkedCourseIds: z.array(z.string()).optional().default([]).describe("Course IDs this coupon applies to (empty = all courses)"),
  linkedBundleIds: z.array(z.string()).optional().default([]).describe("Bundle IDs this coupon applies to"),
  linkedCohortIds: z.array(z.string()).optional().default([]).describe("Cohort IDs this coupon applies to"),
  createdById: z.string().optional().default("").describe("Admin user ID who created this coupon"),
  createdByEmail: z.string().optional().default("").describe("Admin email who created this coupon"),
};

async function generateCouponId(): Promise<string> {
  const counterRef = db.collection(COLLECTION.COUNTERS).doc("couponCounter");
  const newId = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let lastNumber = 70000000;
    if (counterDoc.exists) {
      lastNumber = counterDoc.data()?.lastNumber ?? 70000000;
    }
    const gap = Math.floor(Math.random() * (50 - 20 + 1)) + 20;
    const nextNumber = lastNumber + gap;
    transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });
    return nextNumber;
  });
  return `coupon_${newId}`;
}

export async function createCoupon(params: {
  code: string;
  discountPercentage: number;
  expiryDate: string;
  usageLimit?: number;
  linkedCourseIds?: string[];
  linkedBundleIds?: string[];
  linkedCohortIds?: string[];
  createdById?: string;
  createdByEmail?: string;
}) {
  if (params.discountPercentage < 1 || params.discountPercentage > 100) {
    throw new Error("Discount percentage must be between 1 and 100");
  }

  // Check for duplicate code
  const existing = await db
    .collection(COLLECTION.COUPONS)
    .where("code", "==", params.code.toUpperCase())
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new Error(`Coupon code "${params.code}" already exists`);
  }

  const couponId = await generateCouponId();

  const coupon = {
    id: couponId,
    code: params.code.toUpperCase(),
    discountPercentage: params.discountPercentage,
    expiryDate: new Date(params.expiryDate),
    usageLimit: params.usageLimit ?? 100,
    totalUsed: 0,
    currentUsageCount: 0,
    usedByUserIds: [],
    status: "ACTIVE",
    linkedCourseIds: params.linkedCourseIds ?? [],
    linkedBundleIds: params.linkedBundleIds ?? [],
    linkedCohortIds: params.linkedCohortIds ?? [],
    createdById: params.createdById ?? "",
    createdbyMail: params.createdByEmail ?? "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection(COLLECTION.COUPONS).doc(couponId).set(coupon);

  return {
    couponId,
    code: coupon.code,
    discountPercentage: coupon.discountPercentage,
    expiryDate: params.expiryDate,
    usageLimit: coupon.usageLimit,
    status: "ACTIVE",
    message: `Coupon "${coupon.code}" created successfully with ${coupon.discountPercentage}% discount`,
  };
}
