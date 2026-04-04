import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { courseService } from './courseService';
import { CourseAnalyticsUpdate } from '../types/analytics';
import { COLLECTION } from '../constants';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

class CourseAnalyticsService {

  /**
   * Update course analytics (incremental updates)
   */
  async updateCourseAnalytics(update: CourseAnalyticsUpdate): Promise<void> {
    try {
      const { courseId, timeSpentSec = 0, coursesCompletedIncrement = 0, learnerIncrement = 0 } = update;
      const docRef = db.collection(COLLECTION.COURSE_ANALYTICS).doc(courseId);
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
      } else {
        if (!update.courseTitle) {
          const courseResult = await courseService.getCourseById(courseId);
          if (courseResult.success && courseResult.data) {
            update.courseTitle = courseResult.data.title;
          }
        }
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
