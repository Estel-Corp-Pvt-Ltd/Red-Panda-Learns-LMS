import * as admin from "firebase-admin";
import {
  KarmaRule,
  KarmaActionMap
} from "../../types/karma";
import { KarmaCategory } from "../../types/general";
import { COLLECTION } from "../../constants";
const db = admin.firestore();


interface AddOrUpdateKarmaRuleParams<C extends KarmaCategory> {
  id?: string; // if present → update, else → add
  category: C;
  action: KarmaActionMap[C];
  points: number;
  enabled: boolean;
}

export const karmaRuleService = {
  async addOrUpdateRule<C extends KarmaCategory>({
    id,
    category,
    action,
    points,
    enabled
  }: AddOrUpdateKarmaRuleParams<C>): Promise<KarmaRule<C>> {
    const now = admin.firestore.Timestamp.now();

    const ruleId = id || db.collection(COLLECTION.KARMA_RULES).doc().id;

    const ruleData: KarmaRule<C> = {
      id: ruleId,
      category,
      action,
      points,
      enabled,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: now,
    };

    const ref = db.collection(COLLECTION.KARMA_RULES).doc(ruleId);

    // If updating, merge: true so we don't overwrite createdAt
    await ref.set(ruleData, { merge: !!id });

    return ruleData;
  },

  async getRule(ruleId: string) {
    const snap = await db.collection(COLLECTION.KARMA_RULES).doc(ruleId).get();
    if (!snap.exists) throw new Error("Karma rule not found");
    return snap.data() as KarmaRule;
  },

  async deleteRule(ruleId: string) {
    await db.collection(COLLECTION.KARMA_RULES).doc(ruleId).delete();
  }
};
