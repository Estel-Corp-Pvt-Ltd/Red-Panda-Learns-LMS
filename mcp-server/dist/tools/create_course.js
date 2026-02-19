import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
export const createCourseSchema = {
    title: z.string().describe("Course title (required)"),
    description: z.string().optional().default("").describe("Course description"),
    slug: z
        .string()
        .optional()
        .describe("URL-friendly slug. Auto-generated from title if not provided"),
    instructorId: z.string().optional().default("").describe("Instructor user ID"),
    instructorName: z.string().optional().default("Vizuara AI").describe("Instructor display name"),
    pricingModel: z
        .enum(["FREE", "PAID"])
        .optional()
        .default("PAID")
        .describe("Pricing model: FREE or PAID"),
    regularPrice: z.number().optional().default(0).describe("Regular price (in paisa/cents)"),
    salePrice: z.number().optional().default(0).describe("Sale price (in paisa/cents)"),
    mode: z
        .enum(["LIVE", "SELF-PACED"])
        .optional()
        .default("SELF-PACED")
        .describe("Course mode: LIVE or SELF-PACED"),
};
/**
 * Generates a slug from a title string.
 * Converts to lowercase, removes special chars, replaces spaces with hyphens.
 */
function generateSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}
/**
 * Generates a unique course ID using the Counters collection.
 * Format: course_<number>, starting from 20000000 with random 10-50 gaps.
 */
async function generateCourseId() {
    const counterRef = db.collection(COLLECTION.COUNTERS).doc("courseCounter");
    const newId = await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let lastNumber = 20000000;
        if (counterDoc.exists) {
            lastNumber = counterDoc.data()?.lastNumber ?? 20000000;
        }
        const gap = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
        const nextNumber = lastNumber + gap;
        transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });
        return nextNumber;
    });
    return `course_${newId}`;
}
/**
 * Checks if a slug already exists in the Courses collection.
 * If it does, appends a numeric suffix to make it unique.
 */
async function ensureUniqueSlug(slug) {
    const snapshot = await db
        .collection(COLLECTION.COURSES)
        .where("slug", "==", slug)
        .limit(1)
        .get();
    if (snapshot.empty) {
        return slug;
    }
    // Append random suffix
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    return `${slug}-${suffix}`;
}
export async function createCourse(params) {
    // Generate course ID
    const courseId = await generateCourseId();
    // Generate or validate slug
    let slug = params.slug ? generateSlug(params.slug) : generateSlug(params.title);
    slug = await ensureUniqueSlug(slug);
    const course = {
        id: courseId,
        title: params.title,
        slug,
        description: params.description ?? "",
        regularPrice: params.regularPrice ?? 0,
        salePrice: params.salePrice ?? 0,
        pricingModel: params.pricingModel ?? "PAID",
        tags: [],
        categoryIds: [],
        targetAudienceIds: [],
        instructorId: params.instructorId ?? "",
        instructorName: params.instructorName ?? "Vizuara AI",
        status: "DRAFT",
        mode: params.mode ?? "SELF-PACED",
        liveAt: null,
        certificateTemplateId: "",
        topics: [],
        duration: { hours: 0, minutes: 0 },
        isEnrollmentPaused: true,
        isMailSendingEnabled: false,
        isCertificateEnabled: false,
        isCourseCompletionEnabled: false,
        customCertificateName: "",
        isForumEnabled: false,
        isWelcomeMessageEnabled: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };
    await db.collection(COLLECTION.COURSES).doc(courseId).set(course);
    return {
        courseId,
        title: params.title,
        slug,
        status: "DRAFT",
        pricingModel: course.pricingModel,
        regularPrice: course.regularPrice,
        salePrice: course.salePrice,
        mode: course.mode,
        instructorName: course.instructorName,
        message: `Course "${params.title}" created successfully as DRAFT`,
    };
}
//# sourceMappingURL=create_course.js.map