import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { AnnouncementScope, AnnouncementStatus } from "@/types/general";

export interface Announcement {
  id: string;
  scope: AnnouncementScope;
  // required if scope === COURSE
  courseId?: string | null;
  title: string;
  body: string;
  status: AnnouncementStatus;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  createdBy: string | null;
}

export interface CourseEnrollAnnouncement {
  id: string;
  courseId: string;
  subject: string;
  body: string;
  createdAt: Timestamp | FieldValue;
}
