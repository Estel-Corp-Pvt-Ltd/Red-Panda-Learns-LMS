import { FieldValue, Timestamp } from "firebase/firestore";
import { QuizQuestionType, QuizStatus, QuizSubmissionStatus } from "./general";

export interface TopicQuiz {
  id: string;
  courseId: string;
  topicId: string;
  title: string;
  description?: string;
  questions: Question[];
  totalMarks: number;
  passingPercentage: number;
  durationMinutes: number;
  enableFreeNavigation: boolean;
  status: QuizStatus;
  xpReward?: number;
  createdBy: string;
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
}

export interface TopicQuizSubmission {
  id: string;
  quizId: string;
  courseId: string;
  topicId: string;
  userId: string;
  userName: string;
  userEmail: string;
  startedAt: FieldValue | Timestamp;
  submittedAt?: FieldValue | Timestamp;
  lastSavedAt: FieldValue | Timestamp;
  answers: SubmittedAnswer[];
  totalScore?: number;
  passed?: boolean;
  status: QuizSubmissionStatus;
  xpAwarded: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  courseId: string;
  allowAllStudents: boolean;
  allowedStudentUids?: string[];
  description?: string;
  questions: Question[];
  totalMarks: number;
  passingPercentage: number;
  scheduledAt: Timestamp;
  endAt: Timestamp;
  durationMinutes: number;
  enableFreeNavigation: boolean;
  releaseScores?: boolean;
  status: QuizStatus;
  createdBy: string; // uid
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
}

export interface Question {
  questionNo: number;
  description: string;
  type: QuizQuestionType;
  options: string[];
  correctAnswer: string | string[];
  marks: number;
  attachments: string[];
  rules?: {
    caseInSensitive: boolean;
    spaceRemoval: boolean;
  };
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  userId: string;
  userName: string;
  userEmail: string;
  startedAt: FieldValue;
  submittedAt?: FieldValue;
  lastSavedAt: FieldValue;
  answers: SubmittedAnswer[];
  totalScore?: number;
  passed?: boolean;
  status: QuizSubmissionStatus;
}

export interface SubmittedAnswer {
  questionNo: number;
  type: QuizQuestionType;
  answer: string | string[] | null;
  markedForReview: boolean;
  isCorrect?: boolean;
  obtainedMarks?: number;
}
