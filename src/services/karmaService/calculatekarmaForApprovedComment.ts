import { BACKEND_URL } from "@/config";
import { COMMUNITY_ACTION, KARMA_CATEGORY } from "@/constants";

export const calculatekarmaForComments = {
  calculateKarmaForApprovedComment(
    userId: string,
    idToken: string,
    courseId: string,
    userName: string
  ): void {
    if (!idToken) {
      console.error("[KarmaCalculation] Missing ID token");
      return;
    }

    // Fire-and-forget fetch
    fetch(`${BACKEND_URL}/addKarma`, {
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
        userName,
      }),
    }).catch((err) => {
      console.error("[KarmaCalculation] Failed to add karma for approved comment:", err);
    });
  },

  calculateKarmaForRejectedComment(
    userId: string,
    idToken: string,
    courseId: string,
    userName: string
  ): void {
    if (!idToken) {
      console.error("[KarmaCalculation] Missing ID token");
      return;
    }

    // Fire-and-forget fetch
    fetch(`${BACKEND_URL}/addKarma`, {
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
        userName,
      }),
    }).catch((err) => {
      console.error("[KarmaCalculation] Failed to deduct karma for rejected comment:", err);
    });
  },
};
