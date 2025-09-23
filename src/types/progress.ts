/**
 * Learning progress always represents a single course's progress
 */
export interface LearningProgress {
  courseId: string;            
  currentLessonId?: string | null;
  lastAccessed?: Date | null;

  completedLessons: number;
  lessonHistory: string[];
  totalLessons: number;
  percentage: number;
}