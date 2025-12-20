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
  lessonHistory: {
    [lessonId: string]: {
      timeSpent: number;
      markedAsComplete: boolean;
      completedAt: Timestamp | FieldValue | null;
    };
  };
  certification?: {
    issued: boolean;
    issuedAt: Timestamp | FieldValue;
    certificateId: string;
    remark?: string;
    grade?: number | string | null;
  };
  completionDate: Timestamp | FieldValue | null;
  updatedAt: Timestamp | FieldValue;
};

