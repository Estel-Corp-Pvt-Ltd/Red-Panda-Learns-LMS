
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
  orderBy,
  limit as firestoreLimit
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { logError } from "@/utils/logger";
import { authService } from "../authService";

export interface LessonAnalytics {
  id: string; // Format: {courseId}_{lessonId}
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  totalTimeSpentSec: number;
  totalLearners: number;
  totalCompletions: number;
  completionRate?: number; // Calculated completion rate percentage
  formattedTime?: string; // Human-readable time format (e.g., "2h 45m")
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

class LessonAnalyticsService {
  private collectionName = "LessonAnalytics";
  private backendUrl = import.meta.env.VITE_BACKEND_URL || "";
  /**
   * Get analytics document ID
   */
  private getDocId(courseId: string, lessonId: string): string {
    return `${courseId}_${lessonId}`;
  }

  /**
   * Get lesson analytics by course and lesson
   */
  async getLessonAnalytics(courseId: string, lessonId: string): Promise<LessonAnalytics | null> {
    try {
      const docId = this.getDocId(courseId, lessonId);
      const docRef = doc(db, this.collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        courseId: data.courseId,
        courseTitle: data.courseTitle,
        lessonId: data.lessonId,
        lessonTitle: data.lessonTitle,
        totalTimeSpentSec: data.totalTimeSpentSec || 0,
        totalCompletions: data.totalCompletions || 0,
        totalLearners: data.totalLearners || 0,
        updatedAt: data.updatedAt?.toDate() || null,
        createdAt: data.createdAt?.toDate() || null,
      };
    } catch (error) {
      logError("getLessonAnalytics", error);
      return null;
    }
  }

  /**
   * Get all analytics for a course
   */
  async getAnalyticsByCourse(courseId: string): Promise<LessonAnalytics[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where("courseId", "==", courseId)
      );

      const querySnapshot = await getDocs(q);
      const analytics: LessonAnalytics[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        analytics.push({
          id: doc.id,
          courseId: data.courseId,
          courseTitle: data.courseTitle,
          lessonId: data.lessonId,
          lessonTitle: data.lessonTitle,
          totalLearners: data.totalLearners,
          totalTimeSpentSec: data.totalTimeSpentSec || 0,
          totalCompletions: data.totalCompletions || 0,
          updatedAt: data.updatedAt?.toDate() || null,
          createdAt: data.createdAt?.toDate() || null,
        });
      });

      return analytics;
    } catch (error) {
      logError("getAnalyticsByCourse", error);
      return [];
    }
  }

  /**
   * Get top lessons by time spent (server-side sorting and limiting)
   */
  async getTopLessonsByTimeSpent(limitCount: number = 10): Promise<LessonAnalytics[]> {
    try {
      // Use Firestore's orderBy and limit for server-side sorting
      const q = query(
        collection(db, this.collectionName),
        orderBy("totalTimeSpentSec", "desc"),
        firestoreLimit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const analytics: LessonAnalytics[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Fix: Correct completion rate formula (completions / learners, not learners / completions)
        const completionRate = data.totalLearners > 0
          ? (data.totalCompletions / data.totalLearners) * 100
          : 0;

        analytics.push({
          id: doc.id,
          courseId: data.courseId,
          courseTitle: data.courseTitle,
          lessonId: data.lessonId,
          lessonTitle: data.lessonTitle,
          totalLearners: data.totalLearners || 0,
          totalTimeSpentSec: data.totalTimeSpentSec || 0,
          totalCompletions: data.totalCompletions || 0,
          completionRate,
          formattedTime: formatSeconds(data.totalTimeSpentSec || 0),
          updatedAt: data.updatedAt?.toDate() || null,
          createdAt: data.createdAt?.toDate() || null,
        });
      });

      return analytics;
    } catch (error) {
      logError("getTopLessonsByTimeSpent", error);
      return [];
    }
  }

  /**
   * Get the most popular lesson (by time spent) for dashboard overview
   */
  async getMostPopularLesson(): Promise<LessonAnalytics | null> {
    try {
      const topLessons = await this.getTopLessonsByTimeSpent(1);
      return topLessons.length > 0 ? topLessons[0] : null;
    } catch (error) {
      logError("getMostPopularLesson", error);
      return null;
    }
  }

  async spendTimeOnLesson(courseId: string, lessonId: string, timeSpentSec: number): Promise<void> {
    try {
      const idToken = await authService.getToken();
      await fetch(`${this.backendUrl}/lessonTimeSpent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          courseId,
          lessonId,
          timeSpentSec,
        }),
      });
    } catch {
      console.error("spendTimeOnLesson error");
    }
  }
}

export const lessonAnalyticsService = new LessonAnalyticsService();
