/**
 * Learning progress and certification always represents a single course's progress
 */
export interface LearningProgress {
  courseId: string;            
  currentLessonId?: string | null;
  lastAccessed?: Date | null;

  completedLessons: number;
  lessonHistory: string[];
  totalLessons: number;
  percentage: number;

  //  Certification for this course
  certification: {
    issued: boolean;
    issuedAt?: Date | null;
    certificateId?: string; // Optional unique certificate ID
  };
}