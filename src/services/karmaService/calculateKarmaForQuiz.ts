import { BACKEND_URL } from "@/config";
import { KARMA_CATEGORY, LEARNING_ACTION } from "@/constants";
import { LearningAction } from "@/types/general";

export const calulateKarmaForQuizSubmission = {
  async calculateKarma(
    passingPercentage: number,
    totalMarks: number,
    userScore: number,
    userId: string,
    courseId: string,
    idToken: string
  ): Promise<void> {
    try {
      // Validation
      if (passingPercentage == null || totalMarks == null) {
        console.error("[KarmaCalculation] Missing passingPercentage or totalMarks", {
          passingPercentage,
          totalMarks,
        });
        return;
      }

      if (totalMarks <= 0) {
        console.error("[KarmaCalculation] Invalid totalMarks value:", totalMarks);
        return;
      }

      if (!userId) {
        console.error("[KarmaCalculation] Missing User ID");
        throw new Error("ID token is required");
      }

      const percentage = (userScore / totalMarks) * 100;

      let action: LearningAction;

      // Correct priority order
      if (percentage > 90) {
        action = LEARNING_ACTION.QUIZ_GRADE_90_PLUS;
      } else if (percentage >= passingPercentage) {
        action = LEARNING_ACTION.QUIZ_GRADE_PASS;
      } else {
        action = LEARNING_ACTION.QUIZ_GRADE_FAIL;
      }

      // Fire-and-forget
      fetch(`${BACKEND_URL}/addKarma`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId,
          category: KARMA_CATEGORY.LEARNING,
          action,
          courseId,
        }),
      }).catch((err) => {
        console.error("[KarmaCalculation] Failed to add karma:", err);
      });
    } catch (err) {
      console.error("[KarmaCalculation] Error assigning karma:", err);
    }
  },
};
