import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { AnnouncementScope, AnnouncementStatus } from "./general";

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