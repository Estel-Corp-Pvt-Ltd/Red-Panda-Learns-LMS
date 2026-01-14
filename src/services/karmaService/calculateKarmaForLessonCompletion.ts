// src/services/karma/karmaForLessonCompletionService.ts

import { BACKEND_URL } from "@/config";
import { KARMA_CATEGORY, LEARNING_ACTION } from "@/constants";

export const calculateKarmaForLessonCompleted = {
  /**
   * Fire-and-forget: award karma to a user for completing a lesson
   */
  awardKarmaForLessonCompletion(userId: string, idToken: string, courseId: string): void {
    // Validate inputs
    if (!userId) {
      console.error("[KarmaLessonCompletion] Missing userId");
      return;
    }

    if (!idToken) {
      console.error("[KarmaLessonCompletion] Missing ID token");
      return;
    }

    if (!courseId) {
      console.error("[KarmaLessonCompletion] Missing courseId");
      return;
    }

    const payload = {
      userId,
      category: KARMA_CATEGORY.LEARNING,
      action: LEARNING_ACTION.LESSON_COMPLETION,
      courseId,
    };

    console.log("[KarmaLessonCompletion] Sending request to:", `${BACKEND_URL}/addKarma`);
    console.log("[KarmaLessonCompletion] Payload:", payload);
    console.log(
      "[KarmaLessonCompletion] Token (first 20 chars):",
      idToken?.substring(0, 20) + "..."
    );

    fetch(`${BACKEND_URL}/addKarma`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.error("[KarmaLessonCompletion] Server error:", {
            status: response.status,
            statusText: response.statusText,
            data,
          });
        } else {
          console.log("[KarmaLessonCompletion] Karma awarded successfully:", data);
        }
      })
      .catch((err) => {
        console.error("[KarmaLessonCompletion] Network error:", err);
      });
  },
};
