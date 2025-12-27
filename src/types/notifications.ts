import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NotificationStatus } from "./general";

export interface SubmissionNotification {
  id: string;
  submissionId: string;
  assignmentId: string;
  studentId: string;
  adminId: string;
  adminEmail: string;
  status: NotificationStatus;
  emailSentAt?: Timestamp | FieldValue;
  reminderPaused: boolean; // true if admin paused reminders for this notification
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  lastError?: string;
}
