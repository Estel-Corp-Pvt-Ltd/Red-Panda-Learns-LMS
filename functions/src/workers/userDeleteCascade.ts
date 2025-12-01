import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function to delete all user-related data when a user is deleted
 * Trigger: When a user document is deleted from Firestore
 */
export const userDeleteCascade = onDocumentDeleted(
  'Users/{userId}',
  async (event) => {
    const userId = event.params.userId;
    let batch = db.batch();

    try {
      logger.info(`Deleting user: ${userId}`);

      // Delete auth user
      await admin.auth().deleteUser(userId);

      // Get all enrollments that belong to this user
      const enrollmentSnapshot = await db.collection('Enrollments')
        .where('userId', '==', userId)
        .get();

      enrollmentSnapshot.forEach(doc => {
        logger.info(`Deleting enrollment: ${doc.id} for user: ${userId}`);
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Reset batch for next operations
      batch = db.batch();

      // Delete all lesson progress records for this user
      const lessonProgressSnapshot = await db.collection('LearningProgress')
        .where('userId', '==', userId)
        .get();

      lessonProgressSnapshot.forEach(doc => {
        logger.info(`Deleting lesson progress: ${doc.id} for user: ${userId}`);
        batch.delete(doc.ref);
      });

      // Commit the batch deletion
      await batch.commit();

      logger.info(`Successfully deleted for user: ${userId}`);
      return { success: true };

    } catch (error) {
      logger.error(`Error deleting lessons for user ${userId}:`, error);
      return { success: false };
    }
  }
);
