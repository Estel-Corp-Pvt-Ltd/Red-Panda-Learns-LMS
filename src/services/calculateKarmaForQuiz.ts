import { BACKEND_URL } from "@/config";
import { KARMA_CATEGORY, LEARNING_ACTION } from "@/constants";
import { LearningAction } from "@/types/general";

export const calulateKarmaForQuizSubmission = {
  async calculateKarma(
    passingPercentage: number,
    totalMarks: number,
    userScore: number,
    idToken: string,
    courseId: string
  ): Promise<void> {
    try {
      // Validation
      if (passingPercentage == null || totalMarks == null) {
        console.error(
          "[KarmaCalculation] Missing passingPercentage or totalMarks",
          { passingPercentage, totalMarks }
        );
        return;
      }

      if (totalMarks <= 0) {
        console.error("[KarmaCalculation] Invalid totalMarks value:", totalMarks);
        return;
      }

      if (!idToken) {
        console.error("[KarmaCalculation] Missing ID token");
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

      const response = await fetch(`${BACKEND_URL}/addKarma`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          category: KARMA_CATEGORY.LEARNING,
          action,
          courseId,
        }),
      });

      if (!response.ok) {
        console.error(
          "[KarmaCalculation] Failed to add karma",
          response.status
        );
      }
    } catch (err) {
      console.error("[KarmaCalculation] Error while assigning karma:", err);
    }
  },
};
