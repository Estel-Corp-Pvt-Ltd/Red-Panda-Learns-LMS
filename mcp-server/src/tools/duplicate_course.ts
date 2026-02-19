import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const duplicateCourseSchema = {
  courseId: z.string().describe("The course ID to duplicate"),
  newTitle: z.string().optional().describe("Optional new title. Defaults to 'Copy of <original title>'"),
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

async function generateCourseId(): Promise<string> {
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

async function ensureUniqueSlug(slug: string): Promise<string> {
  const snapshot = await db
    .collection(COLLECTION.COURSES)
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return slug;
  }

  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `${slug}-${suffix}`;
}

export async function duplicateCourse(params: {
  courseId: string;
  newTitle?: string;
}) {
  // Fetch source course
  const sourceDoc = await db.collection(COLLECTION.COURSES).doc(params.courseId).get();

  if (!sourceDoc.exists) {
    throw new Error(`Course not found: ${params.courseId}`);
  }

  const source = sourceDoc.data()!;
  const newTitle = params.newTitle || `Copy of ${source.title}`;

  // Generate new ID and slug
  const newCourseId = await generateCourseId();
  const baseSlug = generateSlug(newTitle);
  const newSlug = await ensureUniqueSlug(baseSlug);

  // Build the duplicate document
  const duplicate: Record<string, any> = {
    id: newCourseId,
    title: newTitle,
    slug: newSlug,
    description: source.description || "",
    duration: source.duration || { hours: 0, minutes: 0 },
    thumbnail: source.thumbnail || "",
    regularPrice: source.regularPrice ?? 0,
    salePrice: source.salePrice ?? 0,
    pricingModel: source.pricingModel || "FREE",
    categoryIds: source.categoryIds || [],
    targetAudienceIds: source.targetAudienceIds || [],
    tags: source.tags || [],
    instructorId: source.instructorId || "",
    instructorName: source.instructorName || "",
    mode: source.mode || "SELF-PACED",
    certificateTemplateId: source.certificateTemplateId || "",
    customCertificateName: source.customCertificateName || "",
    isEnrollmentPaused: true,
    isMailSendingEnabled: source.isMailSendingEnabled ?? false,
    isCertificateEnabled: source.isCertificateEnabled ?? false,
    isCourseCompletionEnabled: source.isCourseCompletionEnabled ?? false,
    isForumEnabled: source.isForumEnabled ?? false,
    isWelcomeMessageEnabled: source.isWelcomeMessageEnabled ?? false,
    // Copy topics structure as-is (same lesson/assignment references)
    topics: source.topics || [],
    // Reset fields
    status: "DRAFT",
    liveAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection(COLLECTION.COURSES).doc(newCourseId).set(duplicate);

  const topicCount = (source.topics || []).length;
  const itemCount = (source.topics || []).reduce(
    (sum: number, t: any) => sum + (t.items?.length || 0),
    0
  );

  return {
    newCourseId,
    newSlug: newSlug,
    newTitle,
    sourceCourseId: params.courseId,
    sourceTitle: source.title,
    status: "DRAFT",
    copiedTopics: topicCount,
    copiedItems: itemCount,
    message: `Course duplicated: "${source.title}" → "${newTitle}" (${topicCount} topics, ${itemCount} items). Status: DRAFT`,
  };
}
