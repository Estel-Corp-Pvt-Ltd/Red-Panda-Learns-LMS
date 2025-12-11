import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

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

class CourseAnalyticsService {
  private collectionName = "CourseAnalytics";

  /**
   * Update course analytics (incremental updates)
   */
  async updateCourseAnalytics(update: CourseAnalyticsUpdate): Promise<void> {
    try {
      const { courseId, timeSpentSec = 0, coursesCompletedIncrement = 0, learnerIncrement = 0 } = update;
      const docRef = db.collection(this.collectionName).doc(courseId);
      const docSnap = await docRef.get();

      const updateData: any = {
        courseId,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Add increments if provided
      if (timeSpentSec > 0) {
        updateData.totalTimeSpentSec = FieldValue.increment(timeSpentSec);
      }
      if (coursesCompletedIncrement >= 0) {
        updateData.coursesCompleted = FieldValue.increment(coursesCompletedIncrement);
      }
      if (learnerIncrement > 0) {
        updateData.totalLearners = FieldValue.increment(learnerIncrement);
      }
      if (update.courseTitle) {
        updateData.courseTitle = update.courseTitle;
      }

      if (docSnap.exists) {
        // Update existing document
        await docRef.update(updateData);

        // Recalculate average completion rate
        // await this.recalculateCompletionRate(courseId);
      } else {
        // Create new document
        const initialData = {
          courseId,
          courseTitle: update.courseTitle || "",
          totalTimeSpentSec: timeSpentSec || 0,
          coursesCompleted: coursesCompletedIncrement || 0,
          totalLearners: learnerIncrement || 1,
          avgCompletionRate: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(initialData);
      }
    } catch (error) {
      console.error("updateCourseAnalytics error:", error);
    }
  }
}

export const courseAnalyticsService = new CourseAnalyticsService();
