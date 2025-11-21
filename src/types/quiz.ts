import { FieldValue, Timestamp } from "firebase/firestore";
import { QuizQuestionType, QuizStatus, QuizSubmissionStatus } from "./general";

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
    scheduledAt: FieldValue | Timestamp;
    durationMinutes: number;
    enableFreeNavigation: boolean;
    status: QuizStatus;
    createdBy: string; // uid
    createdAt: FieldValue | Timestamp;
    updatedAt: FieldValue | Timestamp;
};

export interface Question {
    questionNo: number;
    description: string;
    type: QuizQuestionType;
    options: string[];
    correctAnswer: string | string[];
    marks: number;
};

export interface QuizSubmission {
    id: string;
    quizId: string;
    userId: string;
    startedAt: FieldValue | Timestamp;
    submittedAt?: FieldValue | Timestamp;
    lastSavedAt: FieldValue | Timestamp;
    answers: SubmittedAnswer[];
    totalScore?: number;
    passed?: boolean;
    status: QuizSubmissionStatus;
};

export interface SubmittedAnswer {
    questionNo: number;
    type: QuizQuestionType;
    answer: string | string[] | null;
    markedForReview: boolean;
    isCorrect?: boolean;
    obtainedMarks?: number;
};
