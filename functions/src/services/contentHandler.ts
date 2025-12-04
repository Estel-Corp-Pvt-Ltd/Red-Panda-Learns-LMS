import * as admin from "firebase-admin";
import annoucementService from "./announcementService";

import { logger } from "firebase-functions";
import { Result } from "../utils/response";
import { COLLECTION, LEARNING_CONTENT } from "../constants";
import { LearningContentType } from "../types/course";

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

    const course = courseSnap.data() as { slug: string; title: string };
    if (!course.slug) {
      return fail("Course slug is missing");
    }

    const link = `/course/${course.slug}/lesson/${item.id}`;
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
