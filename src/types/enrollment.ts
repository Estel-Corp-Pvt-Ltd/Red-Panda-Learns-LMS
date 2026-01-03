import { FieldValue, Timestamp } from "firebase/firestore";

import { EnrollmentStatus } from "./general";

export interface Enrollment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseName: string;
  bundleId?: string;
  enrollmentDate: Timestamp | FieldValue;
  status: EnrollmentStatus;
  orderId: string;
  certification?: {
    issued: boolean;
    issuedAt: Timestamp | FieldValue;
    certificateId: string;
    remark?: string;
    grade?: number | string | null;
    preferredName?: string | null;
  };
  completionDate: Timestamp | FieldValue | null;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}
