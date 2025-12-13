
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { courseService } from './courseService';
import { lessonService } from './lessonService';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export interface LessonAnalytics {
  id: string; // Format: {courseId}_{lessonId}
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

class LessonAnalyticsService {
  private collectionName = "LessonAnalytics";

  /**
   * Get analytics document ID
   */
  private getDocId(courseId: string, lessonId: string): string {
    return `${lessonId}`;
  }

  /**
   * Update lesson analytics (incremental updates)
   */
  async updateLessonAnalytics(update: LessonAnalyticsUpdate): Promise<void> {
    try {
      const { courseId, lessonId, timeSpentSec = 0, completionIncrement = 0 } = update;
      const docId = this.getDocId(courseId, lessonId);
      const docRef = db.collection(this.collectionName).doc(docId);
      const docSnap = await docRef.get();

      const updateData: any = {
        courseId,
        lessonId,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Add increments if provided
      if (timeSpentSec > 0) {
        updateData.totalTimeSpentSec = FieldValue.increment(timeSpentSec);
      }
      if (completionIncrement > 0) {
        updateData.totalCompletions = FieldValue.increment(completionIncrement);
      }
      if (update.learnersIncrement && update.learnersIncrement > 0) {
        updateData.totalLearners = FieldValue.increment(update.learnersIncrement);
      }
      if (update.lessonTitle) {
        updateData.lessonTitle = update.lessonTitle;
      }
      if (update.courseTitle) {
        updateData.courseTitle = update.courseTitle;
      }
      if (docSnap.exists) {
        // Update existing document
        await docRef.update(updateData);
      } else {
        if (!update.lessonTitle) {
          const lessonResult = await lessonService.getLessonById(lessonId);
          if (lessonResult.success && lessonResult.data) {
            update.lessonTitle = lessonResult.data.title;
          }
        }
        if (!update.courseTitle) {
          const courseResult = await courseService.getCourseById(courseId);
          if (courseResult.success && courseResult.data) {
            update.courseTitle = courseResult.data.title;
          }
        }
        // Create new document
        await docRef.set({
          courseId,
          lessonId,
          courseTitle: update.courseTitle || '',
          totalTimeSpentSec: timeSpentSec || 0,
          totalCompletions: completionIncrement || 0,
          totalLearners: update.learnersIncrement || 0,
          lessonTitle: update.lessonTitle || '',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("updateLessonAnalytics error:", error);
    }
  }
}

export const lessonAnalyticsService = new LessonAnalyticsService();
