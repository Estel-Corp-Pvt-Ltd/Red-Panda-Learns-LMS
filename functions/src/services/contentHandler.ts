import * as admin from "firebase-admin";
import annoucementService from "./announcementService";

import { logger } from "firebase-functions";
import { Result } from "../utils/response";
import { COLLECTION, LEARNING_CONTENT } from "../constants";
import { LearningContentType } from "../types/course";
import { sendAnnouncementEmailonDocCreation } from "../handlers/announcements/sendAnnouncementMailonDocumentCreation";

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export async function handleNewContentItem(params: {
  courseId: string;
  item: {
    id: string;
    type: string;
    title: string;
  };
  createdBy: string;
}): Promise<Result<string>> {
  const { courseId, item, createdBy } = params;

  if (
    item.type !== LEARNING_CONTENT.ASSIGNMENT &&
    item.type !== LEARNING_CONTENT.LESSON
  ) {
    return fail("Unsupported content type");
  }

  try {
    const courseSnap = await db.collection(COLLECTION.COURSES).doc(courseId).get();
    if (!courseSnap.exists) {
      return fail("Course not found");
    }

    const course = courseSnap.data() as { 
      slug: string; 
      title: string;
      isMailSendingEnabled?: boolean; // Add this field
    };
    
    if (!course.slug) {
      return fail("Course slug is missing");
    }

    const link = `/courses/${course.slug}/lesson/${item.id}`;
    const body = `<a href="${link}">View ${item.type.toLowerCase()}</a>`;

    const title =
      item.type === LEARNING_CONTENT.ASSIGNMENT
        ? `New assignment added: ${item.title}`
        : `New lesson added: ${item.title}`;

    const result = await annoucementService.createCourseAssignmentAnnouncement({
      courseId,
      assignmentId: item.id,
      title,
      body,
      createdBy,
      status: "PUBLISHED",
    });

    // Check if announcement was created successfully and mail sending is enabled
// Check if announcement was created successfully and mail sending is enabled
if (result.success && result.data && course.isMailSendingEnabled === true) {
  try {
    const announcementId = result.data; // Now TypeScript knows this is a string
    
    await sendAnnouncementEmailonDocCreation(announcementId);
    
    logger.info(`Announcement email sent for announcement: ${announcementId}`);
  } catch (emailError) {
    // Log the error but don't fail the entire operation
    logger.error("Failed to send announcement email", emailError);
  }
} else if (!course.isMailSendingEnabled) {
  logger.info(`Mail sending is disabled for course: ${courseId}`);
}

    return result;
  } catch (err) {
    logger.error("Error in handleNewContentItem", err);
    return fail("Failed to handle new content item");
  }
}

export function extractAllItems(
  topics: any[] | undefined
): { id: string; type: LearningContentType; title: string }[] {
  if (!topics || !Array.isArray(topics)) return [];

  const items: { id: string; type: LearningContentType; title: string }[] = [];

  for (const topic of topics) {
    if (!topic?.items || !Array.isArray(topic.items)) continue;
    for (const item of topic.items) {
      items.push({
        id: item.id,
        type: item.type as LearningContentType,
        title: item.title,
      });
    }
  }

  return items;
}