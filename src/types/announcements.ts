import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { AnnouncementScope, AnnouncementStatus } from "@/types/general";

export interface Announcement {
  id: string;
  scope: AnnouncementScope;
  // required if scope === COURSE
  courseId?: string | null;
  // required if scope === ORGANIZATION
  organizationId?: string | null;
  title: string;
  body: string;
  status: AnnouncementStatus;
  targetClass?: string;
  targetDivision?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  createdBy: string | null;
}

export interface CourseWelcomeTemplate {
  id: string;
  courseId: string;
  subject: string;
  body: string;
  createdAt: Timestamp | FieldValue;
}
