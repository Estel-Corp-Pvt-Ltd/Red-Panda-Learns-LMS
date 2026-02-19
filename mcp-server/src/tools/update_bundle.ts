import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const updateBundleSchema = {
  bundleId: z.string().describe("The bundle ID to update (e.g. bundle_10001234)"),
  title: z.string().optional().describe("New title"),
  description: z.string().optional().describe("New description"),
  slug: z.string().optional().describe("New URL-friendly slug"),
  salePrice: z.number().optional().describe("New sale price"),
  regularPrice: z.number().optional().describe("New regular price"),
  pricingModel: z.enum(["FREE", "PAID"]).optional().describe("New pricing model"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional().describe("New status"),
  tags: z.array(z.string()).optional().describe("New tags"),
  thumbnail: z.string().optional().describe("New thumbnail URL"),
  instructorId: z.string().optional().describe("New instructor ID"),
  instructorName: z.string().optional().describe("New instructor name"),
};

export async function updateBundle(params: {
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
}) {
  const bundleRef = db.collection(COLLECTION.BUNDLES).doc(params.bundleId);
  const bundleDoc = await bundleRef.get();

  if (!bundleDoc.exists) {
    throw new Error(`Bundle not found: ${params.bundleId}`);
  }

  const updates: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };

  if (params.title !== undefined) updates.title = params.title;
  if (params.description !== undefined) updates.description = params.description;
  if (params.slug !== undefined) updates.slug = params.slug;
  if (params.salePrice !== undefined) updates.salePrice = params.salePrice;
  if (params.regularPrice !== undefined) updates.regularPrice = params.regularPrice;
  if (params.pricingModel !== undefined) updates.pricingModel = params.pricingModel;
  if (params.status !== undefined) updates.status = params.status;
  if (params.tags !== undefined) updates.tags = params.tags;
  if (params.thumbnail !== undefined) updates.thumbnail = params.thumbnail;
  if (params.instructorId !== undefined) updates.instructorId = params.instructorId;
  if (params.instructorName !== undefined) updates.instructorName = params.instructorName;

  await bundleRef.update(updates);

  return {
    bundleId: params.bundleId,
    updatedFields: Object.keys(updates).filter((k) => k !== "updatedAt"),
    message: `Bundle "${params.bundleId}" updated successfully`,
  };
}
