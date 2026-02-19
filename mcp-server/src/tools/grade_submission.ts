import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const gradeSubmissionSchema = {
  submissionId: z.string().describe("The submission document ID to grade"),
  marks: z.number().describe("The marks/score to assign"),
  feedback: z.string().optional().describe("Optional feedback text for the student"),
};

export async function gradeSubmission(params: {
  submissionId: string;
  marks: number;
  feedback?: string;
}) {
  const submissionRef = db.collection(COLLECTION.ASSIGNMENT_SUBMISSIONS).doc(params.submissionId);
  const submissionDoc = await submissionRef.get();

  if (!submissionDoc.exists) {
    throw new Error(`Submission not found: ${params.submissionId}`);
  }

  const submissionData = submissionDoc.data()!;

  // Validate marks against assignment's maximum
  const assignmentDoc = await db
    .collection(COLLECTION.ASSIGNMENTS)
    .doc(submissionData.assignmentId)
    .get();

  if (assignmentDoc.exists) {
    const assignmentData = assignmentDoc.data()!;
    const maxPoints = assignmentData.totalPoints ?? 100;
    if (params.marks > maxPoints) {
      throw new Error(
        `Marks (${params.marks}) exceed maximum points (${maxPoints}) for assignment "${assignmentData.title}"`
      );
    }
    if (params.marks < 0) {
      throw new Error("Marks cannot be negative");
    }
  }

  const updates: Record<string, any> = {
    marks: params.marks,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (params.feedback !== undefined) {
    updates.feedback = params.feedback;
  }

  await submissionRef.update(updates);

  return {
    submissionId: params.submissionId,
    assignmentId: submissionData.assignmentId,
    assignmentTitle: submissionData.assignmentTitle,
    studentId: submissionData.studentId,
    studentName: submissionData.studentName,
    studentEmail: submissionData.studentEmail,
    marks: params.marks,
    feedback: params.feedback ?? submissionData.feedback ?? null,
    message: `Submission graded: ${params.marks} marks assigned to ${submissionData.studentName}`,
  };
}
