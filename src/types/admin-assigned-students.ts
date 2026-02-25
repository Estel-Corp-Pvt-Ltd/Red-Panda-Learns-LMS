import { FieldValue, Timestamp } from "firebase/firestore";

export interface AdminAssignedStudents {
  id: string;
  adminId: string;
  studentId: string;
  active: boolean;
  createdAt: Timestamp | FieldValue;
  createdBy: string;
}
