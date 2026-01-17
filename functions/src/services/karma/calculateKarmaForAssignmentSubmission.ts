import { KARMA_CATEGORY, LEARNING_ACTION } from "../../constants";
import { LearningAction } from "../../types/general";
import { addKarmaService } from "./addkarmaService";

type KarmaInput = {
  studentId: string;
  submissionId: string;
  courseId: string;
  marks: number;
  maximumMarks?: number;
  minimumMarks?: number;
  studentName: string;
};

export async function calculateKarmaForAssignmentSubmission(input: KarmaInput) {
  const { studentId, courseId, marks, maximumMarks, minimumMarks, studentName } = input;

  // Safety checks
  if (maximumMarks == null || maximumMarks <= 0 || minimumMarks == null) {
    console.warn("Invalid marks configuration, skipping karma calculation", {
      studentId,
      courseId,
    });
    return;
  }

  const percentage = (marks / maximumMarks) * 100;
  const failPercentage = (minimumMarks / maximumMarks) * 100;

  let action: LearningAction | null = null;

  switch (true) {
    //  Failed
    case percentage < failPercentage:
      action = LEARNING_ACTION.ASSIGNMENT_GRADE_FAIL;
      break;

    //  90%+
    case percentage > 90:
      action = LEARNING_ACTION.ASSIGNMENT_GRADE_90_PLUS;
      break;

    //  Passed
    case percentage >= failPercentage:
      action = LEARNING_ACTION.ASSIGNMENT_GRADE_PASS;
      break;

    default:
      return;
  }

  if (!action) return;

  await addKarmaService.addKarmaToUser({
    category: KARMA_CATEGORY.LEARNING,
    action,
    userId: studentId,
    courseId,
    userName: studentName,
  });
}
