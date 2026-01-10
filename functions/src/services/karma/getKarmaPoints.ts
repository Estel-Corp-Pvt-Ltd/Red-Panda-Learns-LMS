import * as admin from "firebase-admin";
import { KarmaCategory } from "../../types/general";
import { KarmaActionMap } from "../../types/karma";

const db = admin.firestore();

export async function getKarmaPointsForAction<C extends KarmaCategory>(
  category: C,
  action: KarmaActionMap[C]
) {
  const snapshot = await db
    .collection("karma_rules")
    .where("category", "==", category)
    .where("action", "==", action)
    .where("enabled", "==", true)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error(`No karma rule found for category=${category}, action=${action}`);
  }

  const rule = snapshot.docs[0].data();

  return {
    points: rule.points as number,
  };
}
