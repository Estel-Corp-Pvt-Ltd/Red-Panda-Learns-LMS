import {
  FieldValue,
  Timestamp
} from "firebase/firestore";

export interface LearningProgress {
  id: string;
  userId: string;
  courseId: string;
  currentLessonId: string | null;
  lastAccessed: Timestamp | FieldValue;
  lessonHistory: string[];
  certification?: {
    issued: boolean;
    issuedAt: Timestamp | FieldValue;
    certificateId: string;
    remark?: string;
    grade?: number | string | null;
  };
  completionDate?: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};
