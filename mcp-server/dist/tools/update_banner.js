import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
export const updateBannerSchema = {
    bannerId: z.string().describe("The banner ID to update"),
    title: z.string().optional().describe("New title"),
    description: z.string().optional().describe("New description"),
    ctaTitle: z.string().optional().describe("New CTA button text"),
    ctaLink: z.string().optional().describe("New CTA link URL"),
    imageUrl: z.string().optional().describe("New image URL"),
    gradientColors: z.array(z.string()).optional().describe("New gradient colors"),
    courseIds: z.array(z.string()).optional().describe("New target course IDs"),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional().describe("New status"),
    showToAllUsers: z.boolean().optional().describe("Show to all users"),
    showInLandingPage: z.boolean().optional().describe("Show in landing page"),
};
export async function updateBanner(params) {
    const ref = db.collection(COLLECTION.BANNERS).doc(params.bannerId);
    const doc = await ref.get();
    if (!doc.exists) {
        throw new Error(`Banner not found: ${params.bannerId}`);
    }
    const updates = { updatedAt: FieldValue.serverTimestamp() };
    if (params.title !== undefined)
        updates.title = params.title;
    if (params.description !== undefined)
        updates.description = params.description;
    if (params.ctaTitle !== undefined)
        updates.ctaTitle = params.ctaTitle;
    if (params.ctaLink !== undefined)
        updates.ctaLink = params.ctaLink;
    if (params.imageUrl !== undefined)
        updates.imageUrl = params.imageUrl;
    if (params.gradientColors !== undefined)
        updates.gradientColors = params.gradientColors;
    if (params.courseIds !== undefined)
        updates.courseIds = params.courseIds;
    if (params.status !== undefined)
        updates.status = params.status;
    if (params.showToAllUsers !== undefined)
        updates.showToAllUsers = params.showToAllUsers;
    if (params.showInLandingPage !== undefined)
        updates.showInLandingPage = params.showInLandingPage;
    await ref.update(updates);
    return {
        bannerId: params.bannerId,
        updatedFields: Object.keys(updates).filter((k) => k !== "updatedAt"),
        message: `Banner "${params.bannerId}" updated successfully`,
    };
}
//# sourceMappingURL=update_banner.js.map