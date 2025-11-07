import { FieldValue, Timestamp } from "firebase/firestore";

import { EnrollmentStatus } from "./general";

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  courseName: string;
  bundleId?: string;
  enrollmentDate: Timestamp | FieldValue;
  status: EnrollmentStatus;
  orderId: string;

  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};
