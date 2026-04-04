import { FieldValue, Timestamp } from "firebase/firestore";
import { LearningUnit } from "./general";
export interface ContentLock {
  id: string;
  // What is being locked
  contentType: LearningUnit;
  contentId: string; // lessonId or topicId or assignmentId

  // Scope of users
  appliesToAllUsers?: boolean; // NEW: lock content for every user

  // Scope of users
  organizationId?: string;
  class?: string;
  division?: string;

  // Lock behavior
  isLocked: boolean;
  
  // Scheduling
  scheduledAt?: Timestamp;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}
