import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
export const createBannerSchema = {
    title: z.string().describe("Banner title (required)"),
    description: z.string().optional().default("").describe("Banner description"),
    ctaTitle: z.string().optional().default("").describe("Call-to-action button text"),
    ctaLink: z.string().optional().default("").describe("Call-to-action link URL"),
    imageUrl: z.string().optional().default("").describe("Banner image URL"),
    gradientColors: z.array(z.string()).optional().default(["#3b82f6", "#8b5cf6"]).describe("Gradient colors (2-3 hex values)"),
    courseIds: z.array(z.string()).optional().default([]).describe("Target course IDs (empty = not course-specific)"),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE").describe("Banner status"),
    showToAllUsers: z.boolean().optional().default(true).describe("Show to all users"),
    showInLandingPage: z.boolean().optional().default(false).describe("Show in landing page"),
    createdBy: z.string().optional().default("admin").describe("Creator user ID"),
};
export async function createBanner(params) {
    const docRef = db.collection(COLLECTION.BANNERS).doc();
    const banner = {
        id: docRef.id,
        title: params.title,
        description: params.description ?? "",
        ctaTitle: params.ctaTitle ?? "",
        ctaLink: params.ctaLink ?? "",
        imageUrl: params.imageUrl ?? "",
        gradientColors: params.gradientColors ?? ["#3b82f6", "#8b5cf6"],
        courseIds: params.courseIds ?? [],
        status: params.status ?? "ACTIVE",
        showToAllUsers: params.showToAllUsers ?? true,
        showInLandingPage: params.showInLandingPage ?? false,
        createdBy: params.createdBy ?? "admin",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(banner);
    return {
        bannerId: docRef.id,
        title: params.title,
        status: banner.status,
        message: `Banner "${params.title}" created successfully`,
    };
}
//# sourceMappingURL=create_banner.js.map