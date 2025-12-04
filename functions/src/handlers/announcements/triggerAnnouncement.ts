import { LEARNING_CONTENT } from "../../constants";
import { logger } from "firebase-functions";
import { onDocumentUpdated } from "firebase-functions/firestore";
import {
  extractAllItems,
  handleNewContentItem,
} from "../../services/contentHandler";

export const onCourseUpdated = onDocumentUpdated(
  "Courses/{courseId}",
  async (event) => {
    logger.info(
      `onCourseUpdated function started for course ${event.params.courseId}`
    );

    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) {
      logger.warn("Missing before/after snapshot");
      return;
    }

    const courseId = event.params.courseId;
    logger.info(
      `Course ${courseId}: Before snapshot and after snapshot successfully retrieved`
    );

    const beforeItems = extractAllItems(before.topics);
    const afterItems = extractAllItems(after.topics);

    // Log before and after item counts for debugging
    logger.info(
      `Course ${courseId}: Before topics count: ${beforeItems.length}, After topics count: ${afterItems.length}`
    );

    // Find newly added items
    const newItems = afterItems.filter(
      (item) => !beforeItems.some((b) => b.id === item.id)
    );

    if (newItems.length === 0) {
      logger.info(`Course ${courseId}: no new content added`);
      return;
    }

    // Only handle assignments or lessons
    const filteredItems = newItems.filter((item) =>
      [LEARNING_CONTENT.LESSON, LEARNING_CONTENT.ASSIGNMENT].includes(item.type)
    );

    if (filteredItems.length === 0) {
      logger.info(
        `Course ${courseId}: new items added but not lesson/assignment`
      );
      return;
    }

    logger.info(
      `Course ${courseId}: new content added:`,
      filteredItems.map((i) => `${i.type}:${i.id}`)
    );

    // Log the start of content processing
    logger.info(`Course ${courseId}: Starting to process new items`);

    await Promise.all(
      filteredItems.map(async (item) => {
        try {
          // Log processing of each item
          logger.info(`Processing item ${item.id} of type ${item.type}`);

          await handleNewContentItem({
            courseId,
            item,
            createdBy: "system",
          });

          // Log successful processing
          logger.info(`Successfully processed item ${item.id}`);
        } catch (err) {
          logger.error("Error processing item:", item.id, err);
        }
      })
    );

    logger.info(
      `Course ${courseId}: processed ${filteredItems.length} new items`
    );
  }
);
