export interface CourseAnalytics {
  id: string; // courseId
  courseId: string;
  courseTitle: string;
  totalTimeSpentSec: number;
  coursesCompleted: number;
  totalLearners: number;
  updatedAt: Date | null;
  createdAt: Date | null;
}

export interface CourseAnalyticsUpdate {
  courseId: string;
  courseTitle?: string;
  timeSpentSec?: number;
  coursesCompletedIncrement?: number;
  learnerIncrement?: number;
}

export interface LessonAnalytics {
  id: string; // Format: lessonId}
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  totalTimeSpentSec: number;
  totalLearners: number;
  totalCompletions: number;
  updatedAt: Date | null;
  createdAt: Date | null;
}

export interface LessonAnalyticsUpdate {
  courseId: string;
  courseTitle?: string;
  lessonId: string;
  lessonTitle?: string;
  timeSpentSec?: number; // Time to increment
  completionIncrement?: number; // +1 when marked complete
  learnersIncrement?: number; // +1 when a new learner engages
}
