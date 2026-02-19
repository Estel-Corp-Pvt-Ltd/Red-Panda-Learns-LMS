import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const updateCourseSchema = {
  courseId: z.string().describe("The course ID to update (e.g. course_20001234)"),
  title: z.string().optional().describe("New course title"),
  description: z.string().optional().describe("New course description"),
  slug: z.string().optional().describe("New URL-friendly slug"),
  instructorId: z.string().optional().describe("New instructor user ID"),
  instructorName: z.string().optional().describe("New instructor display name"),
  pricingModel: z.enum(["FREE", "PAID"]).optional().describe("Pricing model: FREE or PAID"),
  regularPrice: z.number().optional().describe("Regular price"),
  salePrice: z.number().optional().describe("Sale price"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional().describe("Course status"),
  mode: z.enum(["LIVE", "SELF-PACED"]).optional().describe("Course mode: LIVE or SELF-PACED"),
  tags: z.array(z.string()).optional().describe("Course tags"),
  categoryIds: z.array(z.string()).optional().describe("Category IDs"),
  targetAudienceIds: z.array(z.string()).optional().describe("Target audience IDs"),
  thumbnail: z.string().optional().describe("Thumbnail URL"),
  durationHours: z.number().optional().describe("Course duration hours"),
  durationMinutes: z.number().optional().describe("Course duration minutes"),
  isEnrollmentPaused: z.boolean().optional().describe("Pause enrollment"),
  isMailSendingEnabled: z.boolean().optional().describe("Enable mail sending"),
  isCertificateEnabled: z.boolean().optional().describe("Enable certificates"),
  isCourseCompletionEnabled: z.boolean().optional().describe("Enable course completion tracking"),
  isForumEnabled: z.boolean().optional().describe("Enable forum"),
  isWelcomeMessageEnabled: z.boolean().optional().describe("Enable welcome message"),
  customCertificateName: z.string().optional().describe("Custom certificate display name"),
  certificateTemplateId: z.string().optional().describe("Certificate template ID"),
};

export async function updateCourse(params: {
  courseId: string;
  title?: string;
  description?: string;
  slug?: string;
  instructorId?: string;
  instructorName?: string;
  pricingModel?: "FREE" | "PAID";
  regularPrice?: number;
  salePrice?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  mode?: "LIVE" | "SELF-PACED";
  tags?: string[];
  categoryIds?: string[];
  targetAudienceIds?: string[];
  thumbnail?: string;
  durationHours?: number;
  durationMinutes?: number;
  isEnrollmentPaused?: boolean;
  isMailSendingEnabled?: boolean;
  isCertificateEnabled?: boolean;
  isCourseCompletionEnabled?: boolean;
  isForumEnabled?: boolean;
  isWelcomeMessageEnabled?: boolean;
  customCertificateName?: string;
  certificateTemplateId?: string;
}) {
  const courseRef = db.collection(COLLECTION.COURSES).doc(params.courseId);
  const courseDoc = await courseRef.get();

  if (!courseDoc.exists) {
    throw new Error(`Course not found: ${params.courseId}`);
  }

  const updateData: Record<string, any> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  const updatedFields: string[] = [];

  // Map each optional param to Firestore field
  if (params.title !== undefined) { updateData.title = params.title; updatedFields.push("title"); }
  if (params.description !== undefined) { updateData.description = params.description; updatedFields.push("description"); }
  if (params.slug !== undefined) {
    // Validate slug uniqueness
    const slugCheck = await db
      .collection(COLLECTION.COURSES)
      .where("slug", "==", params.slug)
      .limit(1)
      .get();
    if (!slugCheck.empty && slugCheck.docs[0].id !== params.courseId) {
      throw new Error(`Slug "${params.slug}" is already in use by another course`);
    }
    updateData.slug = params.slug;
    updatedFields.push("slug");
  }
  if (params.instructorId !== undefined) { updateData.instructorId = params.instructorId; updatedFields.push("instructorId"); }
  if (params.instructorName !== undefined) { updateData.instructorName = params.instructorName; updatedFields.push("instructorName"); }
  if (params.pricingModel !== undefined) { updateData.pricingModel = params.pricingModel; updatedFields.push("pricingModel"); }
  if (params.regularPrice !== undefined) { updateData.regularPrice = params.regularPrice; updatedFields.push("regularPrice"); }
  if (params.salePrice !== undefined) { updateData.salePrice = params.salePrice; updatedFields.push("salePrice"); }
  if (params.status !== undefined) { updateData.status = params.status; updatedFields.push("status"); }
  if (params.mode !== undefined) {
    updateData.mode = params.mode;
    if (params.mode === "SELF-PACED") {
      updateData.liveAt = null;
    }
    updatedFields.push("mode");
  }
  if (params.tags !== undefined) { updateData.tags = params.tags; updatedFields.push("tags"); }
  if (params.categoryIds !== undefined) { updateData.categoryIds = params.categoryIds; updatedFields.push("categoryIds"); }
  if (params.targetAudienceIds !== undefined) { updateData.targetAudienceIds = params.targetAudienceIds; updatedFields.push("targetAudienceIds"); }
  if (params.thumbnail !== undefined) { updateData.thumbnail = params.thumbnail; updatedFields.push("thumbnail"); }
  if (params.durationHours !== undefined || params.durationMinutes !== undefined) {
    const existing = courseDoc.data()?.duration || { hours: 0, minutes: 0 };
    updateData.duration = {
      hours: params.durationHours ?? existing.hours,
      minutes: params.durationMinutes ?? existing.minutes,
    };
    updatedFields.push("duration");
  }
  if (params.isEnrollmentPaused !== undefined) { updateData.isEnrollmentPaused = params.isEnrollmentPaused; updatedFields.push("isEnrollmentPaused"); }
  if (params.isMailSendingEnabled !== undefined) { updateData.isMailSendingEnabled = params.isMailSendingEnabled; updatedFields.push("isMailSendingEnabled"); }
  if (params.isCertificateEnabled !== undefined) { updateData.isCertificateEnabled = params.isCertificateEnabled; updatedFields.push("isCertificateEnabled"); }
  if (params.isCourseCompletionEnabled !== undefined) { updateData.isCourseCompletionEnabled = params.isCourseCompletionEnabled; updatedFields.push("isCourseCompletionEnabled"); }
  if (params.isForumEnabled !== undefined) { updateData.isForumEnabled = params.isForumEnabled; updatedFields.push("isForumEnabled"); }
  if (params.isWelcomeMessageEnabled !== undefined) { updateData.isWelcomeMessageEnabled = params.isWelcomeMessageEnabled; updatedFields.push("isWelcomeMessageEnabled"); }
  if (params.customCertificateName !== undefined) { updateData.customCertificateName = params.customCertificateName; updatedFields.push("customCertificateName"); }
  if (params.certificateTemplateId !== undefined) { updateData.certificateTemplateId = params.certificateTemplateId; updatedFields.push("certificateTemplateId"); }

  if (updatedFields.length === 0) {
    return {
      courseId: params.courseId,
      message: "No fields to update",
      updatedFields: [],
    };
  }

  await courseRef.update(updateData);

  return {
    courseId: params.courseId,
    updatedFields,
    message: `Course "${params.courseId}" updated successfully (${updatedFields.length} field${updatedFields.length > 1 ? "s" : ""})`,
  };
}
