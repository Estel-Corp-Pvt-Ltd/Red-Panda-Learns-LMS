import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function to delete all lessons when a course is deleted
 * Trigger: When a course document is deleted from Firestore
 */
export const courseDeleteCascade = onDocumentDeleted(
  'Courses/{courseId}',
  async (event) => {
    const courseId = event.params.courseId;
    const batch = db.batch();

    try {
      logger.info(`Deleting lessons for course: ${courseId}`);

      // Get all lessons that belong to this course
      const lessonsSnapshot = await db.collection('Lessons')
        .where('courseId', '==', courseId)
        .get();

      // Delete all lessons in batch
      lessonsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Commit the batch deletion
      await batch.commit();

      logger.info(`Successfully deleted ${lessonsSnapshot.size} lessons for course: ${courseId}`);
      return { success: true, deletedLessons: lessonsSnapshot.size };

    } catch (error) {
      logger.error(`Error deleting lessons for course ${courseId}:`, error);
      throw new Error(`Failed to delete lessons for course: ${courseId}`);
    }
  }
);
