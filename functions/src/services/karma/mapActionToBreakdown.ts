import { KARMA_BREAKDOWN_TYPE, KARMA_CATEGORY, LEARNING_ACTION } from "../../constants";
import { KarmaCategory } from "../../types/general";
import { KarmaActionMap } from "../../types/karma";

type BreakdownKey = keyof typeof KARMA_BREAKDOWN_TYPE;

/**
 * Decides which breakdown bucket should receive points
 * based on category + action.
 */
export function mapActionToBreakdown<C extends KarmaCategory>(
  category: C,
  action: KarmaActionMap[C]
): BreakdownKey {
  // LEARNING category
  if (category === KARMA_CATEGORY.LEARNING) {
    switch (action) {
      case LEARNING_ACTION.QUIZ_GRADE_90_PLUS:
      case LEARNING_ACTION.ASSIGNMENT_SUBMISSION_MISS:
      case LEARNING_ACTION.ASSIGNMENT_GRADE_FAIL:
      case LEARNING_ACTION.ASSIGNMENT_GRADE_PASS:
      case LEARNING_ACTION.ASSIGNMENT_GRADE_90_PLUS:
        return KARMA_BREAKDOWN_TYPE.ASSIGNMENT;

      // Quiz-related actions
      case LEARNING_ACTION.QUIZ_MISSED:
      case LEARNING_ACTION.QUIZ_GRADE_FAIL:
      case LEARNING_ACTION.QUIZ_GRADE_PASS:
      case LEARNING_ACTION.QUIZ_GRADE_90_PLUS:
        return KARMA_BREAKDOWN_TYPE.QUIZ;

      // All other actions fall under general learning
      case LEARNING_ACTION.LESSON_WATCH_TIME:
      case LEARNING_ACTION.LESSON_COMPLETION:
        return KARMA_BREAKDOWN_TYPE.LEARNING;

      default:
        return KARMA_BREAKDOWN_TYPE.LEARNING; // fallback
    }
  }

  // COMMUNITY category
  if (category === KARMA_CATEGORY.COMMUNITY) {
    return KARMA_BREAKDOWN_TYPE.COMMUNITY;
  }

  // SOCIAL category
  if (category === KARMA_BREAKDOWN_TYPE.SOCIAL) {
    return KARMA_BREAKDOWN_TYPE.SOCIAL;
  }

  // Fallback (should never happen if types are correct)
  return category;
}
