import { FieldValue, Timestamp } from "firebase/firestore";

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
      type: string;
      completedAt: Timestamp | FieldValue | null;
      // duration: number;
      completionKarmaGranted: boolean;
    };
  };
  updatedAt: Timestamp | FieldValue;
}
