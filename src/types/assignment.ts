import { FieldValue, Timestamp } from "firebase-admin/firestore";


export interface Assignment {
  id: string;
  title: string;
  content: string;
  courseId: string;
  attachments: string[];
  deadline: Timestamp | null;
  fileUploadLimit: number;
  maximumUploadSize: number;
  totalPoints: number;
  minimumPassPoint: number;
  authorId?: string;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  feedback: string | null;
  marks: number | null;
  submissionFiles: string[];
  textSubmissions: string[];
  links: string[];
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}
