import { BACKEND_URL } from "@/config";
import { COMMUNITY_ACTION, KARMA_CATEGORY, LEARNING_ACTION } from "@/constants";
import { LearningAction } from "@/types/general";

export const calculatekarmaForComments = {
  async calculateKarmaForApprovedComment(
    userId: string,
    idToken: string,
    courseId: string
  ): Promise<void> {
    try {
      if (!idToken) {
        console.error("[KarmaCalculation] Missing ID token");
        throw new Error("ID token is required");
      }
      const response = await fetch(`${BACKEND_URL}/addKarma`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId,
          category: KARMA_CATEGORY.COMMUNITY,
          action: COMMUNITY_ACTION.LESSON_COMMENT_APPROVED,
          courseId,
        }),
      });

      if (!response.ok) {
        console.error("[KarmaCalculation] Failed to add karma", response.status);
      }
    } catch (err) {
      console.error("[KarmaCalculation] Error while assigning karma:", err);
    }
  },


    async calculateKarmaForRejectedComment(
    userId: string,
    idToken: string,
    courseId: string
  ): Promise<void> {
    try {
      if (!idToken) {
        console.error("[KarmaCalculation] Missing ID token");
        throw new Error("ID token is required");
      }
      const response = await fetch(`${BACKEND_URL}/addKarma`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId,
          category: KARMA_CATEGORY.COMMUNITY,
          action: COMMUNITY_ACTION.MESSAGE_OR_COMMENT_REJECTED,
          courseId,
        }),
      });

      if (!response.ok) {
        console.error("[KarmaCalculation] Failed to deduce karma", response.status);
      }
    } catch (err) {
      console.error("[KarmaCalculation] Error while assigning karma:", err);
    }
  },
};
