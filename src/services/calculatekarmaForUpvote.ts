// src/services/karma/karmaForUpvotesService.ts

import { BACKEND_URL } from "@/config";
import { COMMUNITY_ACTION, KARMA_CATEGORY } from "@/constants";

/**
 * Service to handle karma for forum message upvotes.
 * Adds karma to message author when someone upvotes,
 * and removes karma if the upvote is removed.
 */
export const calculateKarmaForUpvotes = {
  /**
   * Fire-and-forget: award karma to message author for an upvote
   */
  awardKarma(
    authorUserId: string,
    idToken: string,
    courseId: string
  ): void {
    if (!idToken) {
      console.error("[KarmaUpvote] Missing ID token");
      return;
    }

    fetch(`${BACKEND_URL}/addKarma`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        userId: authorUserId,
        category: KARMA_CATEGORY.COMMUNITY,
        action: COMMUNITY_ACTION.USER_UPVOTE_RECEIVED,
        courseId,
      }),
    }).catch(err =>
      console.error("[KarmaUpvote] Failed to award karma for upvote:", err)
    );
  },

  /**
   * Fire-and-forget: remove karma from message author when an upvote is removed
   */
  removeKarma(
    authorUserId: string,
    idToken: string,
    courseId: string
  ): void {
    if (!idToken) {
      console.error("[KarmaUpvote] Missing ID token");
      return;
    }

    fetch(`${BACKEND_URL}/addKarma`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        userId: authorUserId,
        category: KARMA_CATEGORY.COMMUNITY,
        action: COMMUNITY_ACTION.USER_COMMENT_UNUPVOTED,
        courseId,
      }),
    }).catch(err =>
      console.error("[KarmaUpvote] Failed to remove karma for un-upvote:", err)
    );
  },
};
