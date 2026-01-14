import * as admin from "firebase-admin";
import { getKarmaPointsForAction } from "./getKarmaPoints";
import { COLLECTION, KARMA_BREAKDOWN_TYPE } from "../../constants";
import { KarmaCategory } from "../../types/general";
import { KarmaActionMap } from "../../types/karma";
import { mapActionToBreakdown } from "./mapActionToBreakdown";
import { logger } from "firebase-functions";

const db = admin.firestore();

interface AddKarmaParams<C extends KarmaCategory = KarmaCategory> {
  userId: string;
  category: C;
  action: KarmaActionMap[C];
  courseId: string;
}

export const addKarmaService = {
  async addKarmaToUser<C extends KarmaCategory>({
    category,
    action,
    userId,
    courseId,
  }: AddKarmaParams<C>) {
    logger.info("[Karma] Request received", {
      userId,
      courseId,
      category,
      action,
    });

    const { points } = await getKarmaPointsForAction(category, action);

    logger.info("[Karma] Points resolved for action", {
      category,
      action,
      points,
    });

    const now = admin.firestore.Timestamp.now();
    const date = now.toDate();
    const dayKey = date.toISOString().slice(0, 10);

    const docId = `${userId}_${courseId}_${dayKey}`;
    const karmaDailyRef = db.collection(COLLECTION.KARMA_DAILY).doc(docId);

    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(karmaDailyRef);
      const breakdownKey = mapActionToBreakdown(category, action);

      if (!snapshot.exists) {
        logger.info("[Karma] Creating daily karma record", {
          docId,
          breakdownKey,
          points,
        });

        tx.set(karmaDailyRef, {
          id: docId,
          userId,
          courseId,
          dayKey,
          date: admin.firestore.Timestamp.now(),
          karmaEarned: points,
          breakdown: {
            ...Object.values(KARMA_BREAKDOWN_TYPE).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}),
            [breakdownKey]: points,
          },
        });
      } else {
        logger.info("[Karma] Updating daily karma record", {
          docId,
          breakdownKey,
          points,
        });

        tx.update(karmaDailyRef, {
          karmaEarned: admin.firestore.FieldValue.increment(points),
          [`breakdown.${breakdownKey}`]: admin.firestore.FieldValue.increment(points),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }
    });

    logger.info("[Karma] Karma successfully added", {
      userId,
      courseId,
      category,
      action,
      pointsAdded: points,
    });

    return { userId, courseId, pointsAdded: points };
  },
};
