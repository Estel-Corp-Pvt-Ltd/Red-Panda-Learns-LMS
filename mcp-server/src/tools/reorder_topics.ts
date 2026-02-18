import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const reorderTopicsSchema = {
  courseId: z.string().describe("The course ID to reorder topics in"),
  topicOrder: z.array(z.string()).optional().describe("Array of topic IDs in desired order. All existing topic IDs must be included."),
  itemOrders: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .describe("Map of topicId → ordered array of item IDs. Only include topics whose items you want to reorder."),
};

export async function reorderTopics(params: {
  courseId: string;
  topicOrder?: string[];
  itemOrders?: Record<string, string[]>;
}) {
  if (!params.topicOrder && !params.itemOrders) {
    throw new Error("Must provide at least one of topicOrder or itemOrders");
  }

  const courseRef = db.collection(COLLECTION.COURSES).doc(params.courseId);
  const courseDoc = await courseRef.get();

  if (!courseDoc.exists) {
    throw new Error(`Course not found: ${params.courseId}`);
  }

  const courseData = courseDoc.data()!;
  let topics: any[] = courseData.topics || [];

  // Reorder topics if topicOrder is provided
  if (params.topicOrder) {
    const topicMap = new Map(topics.map((t: any) => [t.id, t]));

    // Validate all IDs are present
    const existingIds = new Set(topics.map((t: any) => t.id));
    const providedIds = new Set(params.topicOrder);

    for (const id of params.topicOrder) {
      if (!existingIds.has(id)) {
        throw new Error(`Topic ID not found in course: ${id}`);
      }
    }

    for (const id of existingIds) {
      if (!providedIds.has(id)) {
        throw new Error(`Missing topic ID in topicOrder: ${id}. All topics must be included.`);
      }
    }

    topics = params.topicOrder.map((id) => topicMap.get(id)!);
  }

  // Reorder items within topics if itemOrders is provided
  if (params.itemOrders) {
    for (const [topicId, orderedItemIds] of Object.entries(params.itemOrders)) {
      const topic = topics.find((t: any) => t.id === topicId);
      if (!topic) {
        throw new Error(`Topic not found for itemOrders: ${topicId}`);
      }

      const itemMap = new Map((topic.items || []).map((item: any) => [item.id, item]));

      // Validate all item IDs
      const existingItemIds = new Set<string>((topic.items || []).map((item: any) => item.id));

      for (const id of orderedItemIds) {
        if (!existingItemIds.has(id)) {
          throw new Error(`Item ID "${id}" not found in topic "${topicId}"`);
        }
      }

      for (const id of existingItemIds) {
        if (!orderedItemIds.includes(id)) {
          throw new Error(`Missing item ID "${id}" in itemOrders for topic "${topicId}". All items must be included.`);
        }
      }

      topic.items = orderedItemIds.map((id: string) => itemMap.get(id)!);
    }
  }

  await courseRef.update({
    topics,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    courseId: params.courseId,
    courseTitle: courseData.title,
    topicsReordered: !!params.topicOrder,
    itemsReordered: params.itemOrders ? Object.keys(params.itemOrders) : [],
    newTopicOrder: topics.map((t: any) => ({ id: t.id, title: t.title, itemCount: t.items?.length || 0 })),
    message: `Course curriculum reordered successfully`,
  };
}
