
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { courseService } from './courseService';
import { lessonService } from './lessonService';
import { LessonAnalyticsUpdate } from '../types/analytics';
import { COLLECTION } from '../constants';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();



class LessonAnalyticsService {

  /**
   * Get analytics document ID
   */
  private getDocId(lessonId: string): string {
    return `${lessonId}`;
  }

  /**
   * Update lesson analytics (incremental updates)
   */
  async updateLessonAnalytics(update: LessonAnalyticsUpdate): Promise<void> {
    try {
      const { courseId, lessonId, timeSpentSec = 0, completionIncrement = 0 } = update;
      const docId = this.getDocId(lessonId);
      const docRef = db.collection(COLLECTION.LESSON_ANALYTICS).doc(docId);
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
