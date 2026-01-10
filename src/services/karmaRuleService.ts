import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { COLLECTION } from "@/constants";
import { BACKEND_URL } from "@/config";

export interface KarmaRule {
  id: string;
  category: string;
  action: string;
  points: number;
  enabled: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface AddOrUpdateKarmaRulePayload {
  id?: string;
  category: string;
  action: string;
  points: number;
  enabled: boolean;
}

export const karmaRuleService = {
  async getAllKarmaRules(): Promise<KarmaRule[]> {
    try {
      const karmaRulesRef = collection(db, COLLECTION.KARMA_RULES);
      const q = query(karmaRulesRef);

      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<KarmaRule, "id">),
      }));
    } catch (error) {
      console.error("Error fetching karma rules:", error);
      throw error;
    }
  },

  async addOrUpdateKarmaRule(data: AddOrUpdateKarmaRulePayload, idToken: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/addOrUpdateKarmaRule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response from server:", errorData);
        throw new Error(errorData.error || "Failed to add or update karma rule");
      }

      const result = await response.json();

      return result;
    } catch (error) {
      console.error("Error adding or updating karma rule:", error);
      throw error;
    }
  },
};
