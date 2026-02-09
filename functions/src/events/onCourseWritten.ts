import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/firestore";
import { COLLECTION } from "../constants";
import { meilisearchService, MEILISEARCH_URL, MEILI_MASTER_KEY } from "../services/meilisearch";

export const onCourseWrittenSync = onDocumentWritten(
  {
    document: `${COLLECTION.COURSES}/{courseId}`,
    secrets: [MEILISEARCH_URL, MEILI_MASTER_KEY],
  },
  async (event) => {
    const courseId = event.params.courseId;

    try {
      const afterData = event.data?.after?.data();
      await meilisearchService.syncCourse(courseId, afterData);
    } catch (err) {
      logger.error(`Meilisearch: failed to sync course ${courseId}`, err);
    }
  }
);
