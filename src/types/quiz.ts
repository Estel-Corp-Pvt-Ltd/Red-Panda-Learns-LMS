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
    scheduledAt: Timestamp;
    endAt: Timestamp;
    durationMinutes: number;
    enableFreeNavigation: boolean;
    releaseScores?: boolean;
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
    userName: string;
    userEmail: string;
    startedAt: FieldValue;
    submittedAt?: FieldValue;
    lastSavedAt: FieldValue;
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
