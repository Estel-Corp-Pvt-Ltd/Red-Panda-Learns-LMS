import {
  FieldValue,
  Timestamp
} from "firebase/firestore";

export interface LearningProgress {
  id: string;
  courseId?: string;
  currentLessonId?: string | null;
  lastAccessed?: Timestamp | FieldValue;

  completedLessons: number;
  lessonHistory: string[];
  totalLessons: number;
  percentage: number;

  certification: {
    issued: boolean;
    issuedAt?: Timestamp | FieldValue;
    certificateId?: string;
  };

  grade?: number | string | null;

  completionDate?: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};
