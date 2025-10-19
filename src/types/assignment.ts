import { FieldValue, Timestamp } from "firebase-admin/firestore";


export interface Assignment {
  id: string;
  title: string;
  content: string;
  attachments: string[];
  deadline?: Timestamp | FieldValue | null;
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
  studentId: string;
  studentName: string;
  feedback?: string;
  marks?: number;
  submissionFiles: string[];
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}
