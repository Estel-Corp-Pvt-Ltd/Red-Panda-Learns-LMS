import * as admin from "firebase-admin";
import { getKarmaPointsForAction } from "./getKarmaPoints";
import { COLLECTION, KARMA_BREAKDOWN_TYPE } from "../../constants";
import { KarmaCategory } from "../../types/general";
import { KarmaActionMap } from "../../types/karma";


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
    const { points } = await getKarmaPointsForAction(category, action);

    const now = admin.firestore.Timestamp.now(); // UTC
    const date = now.toDate(); // JS Date in UTC

    const dayKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
    const docId = `${userId}_${courseId}_${dayKey}`;
    const karmaDailyRef = db.collection(COLLECTION.KARMA_DAILY).doc(docId);

await db.runTransaction(async (tx) => {
  const snapshot = await tx.get(karmaDailyRef);

  if (!snapshot.exists) {
    // First write of the day
    tx.set(karmaDailyRef, {
      id: docId,
      userId,
      courseId,
      dayKey,
      date: admin.firestore.Timestamp.now(),
      karmaEarned: points,
      breakdown: {
        ...Object.values(KARMA_BREAKDOWN_TYPE).reduce(
          (acc, key) => ({ ...acc, [key]: 0 }),
          {}
        ),
        [category]: points,
      },
    });
  } else {
    // Increment only what changed
    tx.update(karmaDailyRef, {
      karmaEarned: admin.firestore.FieldValue.increment(points),
      [`breakdown.${category}`]:
        admin.firestore.FieldValue.increment(points),
      updatedAt: now,
    });
  }
});


    return { userId, courseId, pointsAdded: points };
  },
};
