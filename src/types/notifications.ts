import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NotificationStatus } from "./general";

export interface SubmissionNotifications{
  id: string;                
  submissionId: string;      
  assignmentId: string;
  studentId: string;
  adminId: string;
  adminEmail: string;       
  status: NotificationStatus
  emailSentAt?: Timestamp | FieldValue;
  reminderScheduledAt?: Timestamp | FieldValue;  // when reminder should fire (createdAt + 4d)
  reminderPaused: boolean;   // true if admin paused reminders for this notification
  reminderTaskId?: string;   // Cloud Tasks name/id so you can cancel it
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  lastError?: string;
}