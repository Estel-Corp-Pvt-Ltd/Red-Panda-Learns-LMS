import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  query,
  where,
  getDocs,
  Firestore,
  orderBy,
  limit as firestoreLimit
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { logError } from "@/utils/logger";
import { lessonAnalyticsService } from "./lessonAnalyticsService";
import { COLLECTION } from "@/constants";

export interface CourseAnalytics {
  id: string; // courseId
  courseId: string;
  courseTitle: string;
  totalTimeSpentSec: number;
  totalLessonsCompleted?: number; // For compatibility with admin stats
  coursesCompleted: number;
  totalLearners: number;
  avgCompletionRate?: number; // Calculated completion rate percentage
  formattedTime?: string; // Human-readable time format (e.g., "15h 30m")
  completionRate?: number; // Alias for avgCompletionRate for compatibility
  updatedAt: Date | null;
  createdAt: Date | null;
}

export interface CourseAnalyticsUpdate {
  courseId: string;
  courseTitle: string;
  timeSpentSec?: number;
  lessonsCompletedIncrement?: number;
  learnerIncrement?: number;
}

/**
 * Helper function to format seconds into human-readable time
 */
function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

class CourseAnalyticsService {

  /**
   * Get course analytics
   */
  async getCourseAnalytics(courseId: string): Promise<CourseAnalytics | null> {
    try {
      const docRef = doc(db, COLLECTION.COURSE_ANALYTICS, courseId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        courseId: data.courseId,
        courseTitle: data.courseTitle,
        totalTimeSpentSec: data.totalTimeSpentSec || 0,
        coursesCompleted: data.coursesCompleted || 0,
        totalLessonsCompleted: data.coursesCompleted || 0, // Alias for compatibility
        totalLearners: data.totalLearners || 0,
        updatedAt: data.updatedAt?.toDate() || null,
        createdAt: data.createdAt?.toDate() || null,
      };
    } catch (error) {
      logError("getCourseAnalytics", error);
      return null;
    }
  }

  /**
   * Recalculate average completion rate for a course
   * This should be called after significant updates
   */
  async recalculateCompletionRate(courseId: string): Promise<void> {
    try {
      // Get all lesson analytics for this course
      const lessonAnalytics = await lessonAnalyticsService.getAnalyticsByCourse(courseId);

      if (lessonAnalytics.length === 0) return;

      let totalUniqueLearners = 0;
      let totalCompletions = 0;

      lessonAnalytics.forEach(lesson => {
        totalCompletions += lesson.totalCompletions;
      });

      // Calculate average completion rate
      const totalPossibleCompletions = totalUniqueLearners * lessonAnalytics.length;
      const avgCompletionRate = totalPossibleCompletions > 0
        ? (totalCompletions / totalPossibleCompletions) * 100
        : 0;

      // Update course analytics with calculated rate
      const docRef = doc(db, COLLECTION.COURSE_ANALYTICS, courseId);
      await updateDoc(docRef, {
        avgCompletionRate,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logError("recalculateCompletionRate", error);
    }
  }

  /**
   * Get all course analytics
   */
  async getAllCourseAnalytics(): Promise<CourseAnalytics[]> {
    try {
      const q = collection(db, COLLECTION.COURSE_ANALYTICS);
      const querySnapshot = await getDocs(q);

      const analytics: CourseAnalytics[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        analytics.push({
          id: doc.id,
          courseId: data.courseId,
          courseTitle: data.courseTitle,
          totalTimeSpentSec: data.totalTimeSpentSec || 0,
          coursesCompleted: data.coursesCompleted || 0,
          totalLessonsCompleted: data.coursesCompleted || 0, // Alias for compatibility
          totalLearners: data.totalLearners || 0,
          updatedAt: data.updatedAt?.toDate() || null,
          createdAt: data.createdAt?.toDate() || null,
        });
      });

      return analytics;
    } catch (error) {
      logError("getAllCourseAnalytics", error);
      return [];
    }
  }

  /**
   * Get top courses by time spent (server-side sorting and limiting)
   */
  async getTopCoursesByTimeSpent(limitCount: number = 10): Promise<CourseAnalytics[]> {
    try {
      // Use Firestore's orderBy and limit for server-side sorting
      const q = query(
        collection(db, COLLECTION.COURSE_ANALYTICS),
        orderBy("totalTimeSpentSec", "desc"),
        firestoreLimit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const analytics: CourseAnalytics[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        analytics.push({
          id: doc.id,
          courseId: data.courseId,
          courseTitle: data.courseTitle,
          totalTimeSpentSec: data.totalTimeSpentSec || 0,
          coursesCompleted: data.coursesCompleted || 0,
          totalLessonsCompleted: data.coursesCompleted || 0,
          totalLearners: data.totalLearners || 0,
          formattedTime: formatSeconds(data.totalTimeSpentSec || 0),
          updatedAt: data.updatedAt?.toDate() || null,
          createdAt: data.createdAt?.toDate() || null,
        });
      });

      return analytics;
    } catch (error) {
      logError("getTopCoursesByTimeSpent", error);
      return [];
    }
  }

  /**
   * Get courses with highest completion rate
   * Note: Completion rate is computed, so we need to fetch all and sort client-side
   */
  async getTopCoursesByCompletionRate(limitCount: number = 10): Promise<CourseAnalytics[]> {
    try {
      // Fetch all courses (or implement a stored avgCompletionRate field for server-side sorting)
      const q = collection(db, COLLECTION.COURSE_ANALYTICS);
      const querySnapshot = await getDocs(q);
      const analytics: CourseAnalytics[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const avgCompletionRate = data.totalLearners > 0
          ? (data.coursesCompleted / data.totalLearners) * 100
          : 0;

        // Only include courses with learners
        if (avgCompletionRate > 0) {
          analytics.push({
            id: doc.id,
            courseId: data.courseId,
            courseTitle: data.courseTitle,
            totalTimeSpentSec: data.totalTimeSpentSec || 0,
            coursesCompleted: data.coursesCompleted || 0,
            totalLessonsCompleted: data.coursesCompleted || 0,
            totalLearners: data.totalLearners || 0,
            avgCompletionRate,
            formattedTime: formatSeconds(data.totalTimeSpentSec || 0),
            completionRate: avgCompletionRate,
            updatedAt: data.updatedAt?.toDate() || null,
            createdAt: data.createdAt?.toDate() || null,
          });
        }
      });

      // Sort by avgCompletionRate descending and limit
      return analytics
        .sort((a, b) => (b.avgCompletionRate || 0) - (a.avgCompletionRate || 0))
        .slice(0, limitCount);
    } catch (error) {
      logError("getTopCoursesByCompletionRate", error);
      return [];
    }
  }

  /**
   * Get the course with most time spent (for dashboard overview)
   */
  async getMostTimeSpentCourse(): Promise<CourseAnalytics | null> {
    try {
      const topCourses = await this.getTopCoursesByTimeSpent(1);
      if (topCourses.length === 0) return null;

      const course = topCourses[0];
      const avgCompletionRate = course.totalLearners > 0
        ? (course.coursesCompleted / course.totalLearners) * 100
        : 0;

      return {
        ...course,
        totalLessonsCompleted: course.coursesCompleted, // Ensure compatibility
        avgCompletionRate,
        formattedTime: formatSeconds(course.totalTimeSpentSec),
      };
    } catch (error) {
      logError("getMostTimeSpentCourse", error);
      return null;
    }
  }

  /**
   * Sync course analytics from lesson analytics
   * Call this periodically to ensure data consistency
   */
  async syncCourseAnalytics(courseId: string): Promise<void> {
    try {
      const lessonAnalytics = await lessonAnalyticsService.getAnalyticsByCourse(courseId);

      if (lessonAnalytics.length === 0) return;

      let totalTimeSpentSec = 0;
      let totalCompletions = 0;
      let uniqueLearners = 0;

      lessonAnalytics.forEach(lesson => {
        totalTimeSpentSec += lesson.totalTimeSpentSec;
        totalCompletions += lesson.totalCompletions;
      });

      const totalPossibleCompletions = uniqueLearners * lessonAnalytics.length;
      const avgCompletionRate = totalPossibleCompletions > 0
        ? (totalCompletions / totalPossibleCompletions) * 100
        : 0;

      const docRef = doc(db, COLLECTION.COURSE_ANALYTICS, courseId);
      const docSnap = await getDoc(docRef);

      const updateData = {
        courseId,
        totalTimeSpentSec,
        totalLessonsCompleted: totalCompletions,
        totalLearners: uniqueLearners,
        avgCompletionRate,
        updatedAt: serverTimestamp(),
      };

      if (docSnap.exists()) {
        await updateDoc(docRef, updateData);
      } else {
        await setDoc(docRef, {
          ...updateData,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      logError("syncCourseAnalytics", error);
    }
  }
}

export const courseAnalyticsService = new CourseAnalyticsService();
