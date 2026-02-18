import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
export const createAnnouncementSchema = {
    title: z.string().describe("Announcement title (required)"),
    body: z.string().describe("Announcement body/content (required)"),
    scope: z
        .enum(["GLOBAL", "COURSE", "ORGANIZATION"])
        .optional()
        .default("GLOBAL")
        .describe("Scope: GLOBAL (all users), COURSE (specific course), ORGANIZATION (specific org)"),
    courseId: z.string().optional().describe("Course ID (required if scope is COURSE)"),
    organizationId: z.string().optional().describe("Organization ID (required if scope is ORGANIZATION)"),
    status: z
        .enum(["PUBLISHED", "DRAFT"])
        .optional()
        .default("PUBLISHED")
        .describe("Announcement status"),
    createdBy: z.string().optional().default("admin").describe("Creator user ID"),
    targetClass: z.string().optional().describe("Target class filter (for org announcements)"),
    targetDivision: z.string().optional().describe("Target division filter (for org announcements)"),
};
export async function createAnnouncement(params) {
    const scope = params.scope ?? "GLOBAL";
    if (scope === "COURSE" && !params.courseId) {
        throw new Error("courseId is required when scope is COURSE");
    }
    if (scope === "ORGANIZATION" && !params.organizationId) {
        throw new Error("organizationId is required when scope is ORGANIZATION");
    }
    const announcement = {
        title: params.title,
        body: params.body,
        scope,
        status: params.status ?? "PUBLISHED",
        createdBy: params.createdBy ?? "admin",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };
    if (params.courseId)
        announcement.courseId = params.courseId;
    if (params.organizationId)
        announcement.organizationId = params.organizationId;
    if (params.targetClass)
        announcement.targetClass = params.targetClass;
    if (params.targetDivision)
        announcement.targetDivision = params.targetDivision;
    const docRef = await db.collection(COLLECTION.ANNOUNCEMENTS).add(announcement);
    // Update the doc with its own ID
    await docRef.update({ id: docRef.id });
    return {
        announcementId: docRef.id,
        title: params.title,
        scope,
        status: announcement.status,
        message: `Announcement "${params.title}" created successfully (${scope})`,
    };
}
//# sourceMappingURL=create_announcement.js.map