import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";

export const getCouponsSchema = {
  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).optional().describe("Filter by status"),
  code: z.string().optional().describe("Filter by exact coupon code"),
  limit: z.number().optional().default(50).describe("Maximum number of results (default 50)"),
};

export async function getCoupons(params: {
  status?: string;
  code?: string;
  limit?: number;
}) {
  let query: FirebaseFirestore.Query = db.collection(COLLECTION.COUPONS);

  if (params.status) {
    query = query.where("status", "==", params.status);
  }
  if (params.code) {
    query = query.where("code", "==", params.code.toUpperCase());
  }

  query = query.limit(params.limit ?? 50);

  const snapshot = await query.get();
  const coupons = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      code: data.code,
      discountPercentage: data.discountPercentage,
      expiryDate: data.expiryDate?.toDate?.()?.toISOString?.() ?? data.expiryDate,
      usageLimit: data.usageLimit,
      totalUsed: data.totalUsed ?? 0,
      currentUsageCount: data.currentUsageCount ?? 0,
      status: data.status,
      linkedCourseIds: data.linkedCourseIds ?? [],
      linkedBundleIds: data.linkedBundleIds ?? [],
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
    };
  });

  return { coupons, count: coupons.length };
}
