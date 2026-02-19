import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const createQuizSchema = {
  courseId: z.string().describe("The course ID this quiz belongs to"),
  title: z.string().describe("Quiz title"),
  description: z.string().optional().default("").describe("Quiz description"),
  passingPercentage: z.number().optional().default(50).describe("Passing percentage (0-100)"),
  durationMinutes: z.number().optional().default(30).describe("Quiz duration in minutes"),
  scheduledAt: z.string().describe("Quiz start time as ISO date string (e.g. 2026-03-01T10:00:00Z)"),
  endAt: z.string().describe("Quiz end time as ISO date string (e.g. 2026-03-01T12:00:00Z)"),
  enableFreeNavigation: z.boolean().optional().default(true).describe("Allow students to navigate freely between questions"),
  allowAllStudents: z.boolean().optional().default(true).describe("Allow all enrolled students to take the quiz"),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional().default("DRAFT").describe("Quiz status"),
};

export async function createQuiz(params: {
  courseId: string;
  title: string;
  description?: string;
  passingPercentage?: number;
  durationMinutes?: number;
  scheduledAt: string;
  endAt: string;
  enableFreeNavigation?: boolean;
  allowAllStudents?: boolean;
  status?: "DRAFT" | "PUBLISHED";
}) {
  // Verify course exists
  const courseRef = db.collection(COLLECTION.COURSES).doc(params.courseId);
  const courseDoc = await courseRef.get();

  if (!courseDoc.exists) {
    throw new Error(`Course not found: ${params.courseId}`);
  }

  const courseData = courseDoc.data()!;

  // Auto-generate quiz ID (Firestore auto-ID)
  const quizRef = db.collection(COLLECTION.QUIZZES).doc();
  const quizId = quizRef.id;

  const quiz = {
    id: quizId,
    title: params.title,
    courseId: params.courseId,
    description: params.description ?? "",
    allowAllStudents: params.allowAllStudents ?? true,
    allowedStudentUids: [],
    questions: [],
    totalMarks: 0,
    passingPercentage: params.passingPercentage ?? 50,
    scheduledAt: new Date(params.scheduledAt),
    endAt: new Date(params.endAt),
    durationMinutes: params.durationMinutes ?? 30,
    enableFreeNavigation: params.enableFreeNavigation ?? true,
    releaseScores: false,
    status: params.status ?? "DRAFT",
    createdBy: "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await quizRef.set(quiz);

  return {
    quizId,
    courseId: params.courseId,
    courseTitle: courseData.title,
    title: params.title,
    status: quiz.status,
    scheduledAt: params.scheduledAt,
    endAt: params.endAt,
    durationMinutes: quiz.durationMinutes,
    passingPercentage: quiz.passingPercentage,
    message: `Quiz "${params.title}" created for course "${courseData.title}". Add questions using the admin dashboard.`,
  };
}
