import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/firestore";
import { COLLECTION } from "../constants";
import { meilisearchService, MEILISEARCH_URL, MEILI_MASTER_KEY } from "../services/meilisearch";

export const onAssignmentWrittenSync = onDocumentWritten(
  {
    document: `${COLLECTION.ASSIGNMENTS}/{assignmentId}`,
    secrets: [MEILISEARCH_URL, MEILI_MASTER_KEY],
  },
  async (event) => {
    const assignmentId = event.params.assignmentId;

    try {
      const afterData = event.data?.after?.data();
      await meilisearchService.syncAssignment(assignmentId, afterData);
    } catch (err) {
      logger.error(`Meilisearch: failed to sync assignment ${assignmentId}`, err);
    }
  }
);
