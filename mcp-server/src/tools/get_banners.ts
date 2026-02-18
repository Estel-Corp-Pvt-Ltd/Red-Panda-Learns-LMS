import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";

export const getBannersSchema = {
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().describe("Filter by status"),
  limit: z.number().optional().default(50).describe("Maximum number of results (default 50)"),
};

export async function getBanners(params: { status?: string; limit?: number }) {
  let query: FirebaseFirestore.Query = db.collection(COLLECTION.BANNERS);

  if (params.status) {
    query = query.where("status", "==", params.status);
  }

  query = query.limit(params.limit ?? 50);

  const snapshot = await query.get();
  const banners = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      ctaTitle: data.ctaTitle,
      ctaLink: data.ctaLink,
      imageUrl: data.imageUrl,
      gradientColors: data.gradientColors,
      courseIds: data.courseIds ?? [],
      status: data.status,
      showToAllUsers: data.showToAllUsers,
      showInLandingPage: data.showInLandingPage,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
    };
  });

  return { banners, count: banners.length };
}
