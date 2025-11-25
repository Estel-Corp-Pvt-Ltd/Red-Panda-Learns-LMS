import { FieldValue, Timestamp } from "firebase-admin/firestore";


export interface Assignment {
  id: string;
  title: string;
  content: string;
  attachments: string[];
  textSubmission : string[];
  link : string[];
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
  studentId: string;
  studentName: string;
  feedback?: string;
  marks?: number;
  submissionFiles: string[];
  textSubmission:string[];
  link:string[];
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}
