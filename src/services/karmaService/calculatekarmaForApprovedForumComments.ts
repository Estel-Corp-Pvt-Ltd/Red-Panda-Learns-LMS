import { BACKEND_URL } from "@/config";
import { COMMUNITY_ACTION, KARMA_CATEGORY } from "@/constants";

export const calculatekarmaForForumComments = {
  calculateKarmaForApprovedForumComment(userId: string, idToken: string, courseId: string): void {
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
        action: COMMUNITY_ACTION.FORUM_MESSAGE_APPROVED,
        courseId,
      }),
    }).catch((err) => {
      console.error("[KarmaCalculation] Failed to add karma for approved  forum comment:", err);
    });
  },

  calculateKarmaForRejectedForumComment(userId: string, idToken: string, courseId: string): void {
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
      }),
    }).catch((err) => {
      console.error("[KarmaCalculation] Failed to deduct karma for forum rejected comment:", err);
    });
  },
};
