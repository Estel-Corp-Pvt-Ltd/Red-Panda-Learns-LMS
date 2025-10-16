export interface Assignment {
  id: string;
  title: string;
  content: string;
  attachments: string[];
  duration: number;
  fileUploadLimit: number;
  maximumUploadSize: number;
  totalPoints: number;
  minimumPassPoint: number;
  authorId?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Submission {
  id?: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  feedback?: string;
  marks?: number;
  submissionFiles: string[];
  submittedAt: string;
}
