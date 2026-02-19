import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const createBundleSchema = {
  title: z.string().describe("Bundle title (required)"),
  description: z.string().optional().default("").describe("Bundle description"),
  courseIds: z.array(z.string()).describe("Array of course IDs to include in the bundle"),
  slug: z.string().optional().describe("URL-friendly slug. Auto-generated from title if not provided"),
  pricingModel: z.enum(["FREE", "PAID"]).optional().default("PAID").describe("Pricing model"),
  salePrice: z.number().optional().describe("Override sale price (in paisa/cents). Default: 90% of sum of course prices"),
  instructorId: z.string().optional().default("").describe("Instructor user ID"),
  instructorName: z.string().optional().default("Vizuara AI").describe("Instructor display name"),
  mode: z.enum(["LIVE", "SELF-PACED"]).optional().default("SELF-PACED").describe("Bundle mode"),
  tags: z.array(z.string()).optional().default([]).describe("Tags"),
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateBundleId(): Promise<string> {
  const counterRef = db.collection(COLLECTION.COUNTERS).doc("bundleCounter");
  const newId = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let lastNumber = 10000000;
    if (counterDoc.exists) {
      lastNumber = counterDoc.data()?.lastNumber ?? 10000000;
    }
    const gap = Math.floor(Math.random() * (100 - 30 + 1)) + 30;
    const nextNumber = lastNumber + gap;
    transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });
    return nextNumber;
  });
  return `bundle_${newId}`;
}

export async function createBundle(params: {
  title: string;
  description?: string;
  courseIds: string[];
  slug?: string;
  pricingModel?: "FREE" | "PAID";
  salePrice?: number;
  instructorId?: string;
  instructorName?: string;
  mode?: "LIVE" | "SELF-PACED";
  tags?: string[];
}) {
  if (!params.courseIds.length) {
    throw new Error("Bundle must include at least one course");
  }

  // Fetch course details and calculate pricing
  const courses: { id: string; title: string }[] = [];
  let totalRegularPrice = 0;

  for (const courseId of params.courseIds) {
    const courseDoc = await db.collection(COLLECTION.COURSES).doc(courseId).get();
    if (!courseDoc.exists) {
      throw new Error(`Course not found: ${courseId}`);
    }
    const courseData = courseDoc.data()!;
    courses.push({ id: courseId, title: courseData.title });
    totalRegularPrice += courseData.regularPrice ?? 0;
  }

  const bundleId = await generateBundleId();
  const slug = params.slug ? generateSlug(params.slug) : generateSlug(params.title);
  const salePrice = params.salePrice ?? Math.round(totalRegularPrice * 0.9);

  const bundle = {
    id: bundleId,
    title: params.title,
    description: params.description ?? "",
    slug,
    courses,
    regularPrice: totalRegularPrice,
    salePrice,
    pricingModel: params.pricingModel ?? "PAID",
    mode: params.mode ?? "SELF-PACED",
    liveAt: null,
    instructorId: params.instructorId ?? "",
    instructorName: params.instructorName ?? "Vizuara AI",
    thumbnail: "",
    categoryIds: [],
    targetAudienceIds: [],
    tags: params.tags ?? [],
    status: "DRAFT",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection(COLLECTION.BUNDLES).doc(bundleId).set(bundle);

  return {
    bundleId,
    title: params.title,
    slug,
    courseCount: courses.length,
    regularPrice: totalRegularPrice,
    salePrice,
    status: "DRAFT",
    message: `Bundle "${params.title}" created with ${courses.length} courses`,
  };
}
