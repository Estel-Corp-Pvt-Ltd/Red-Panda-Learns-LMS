import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/firestore";
import { COLLECTION } from "../constants";
import { meilisearchService, MEILISEARCH_URL, MEILI_MASTER_KEY } from "../services/meilisearch";

export const onUserWrittenSync = onDocumentWritten(
  {
    document: `${COLLECTION.USERS}/{userId}`,
    secrets: [MEILISEARCH_URL, MEILI_MASTER_KEY],
  },
  async (event) => {
    const userId = event.params.userId;

    try {
      const afterData = event.data?.after?.data();
      await meilisearchService.syncUser(userId, afterData);
    } catch (err) {
      logger.error(`Meilisearch: failed to sync user ${userId}`, err);
    }
  }
);
