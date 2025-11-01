import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function to remove lesson references from courses when a lesson is deleted
 * Trigger: When a lesson document is deleted from Firestore
 */
export const lessonDeleteCascade = onDocumentDeleted(
  'Lessons/{lessonId}',
  async (event) => {
    const deletedLesson = event.data?.data();
    const lessonId = event.params.lessonId;
    const courseId = deletedLesson?.courseId;

    if (!courseId) {
      logger.info(`Lesson ${lessonId} has no courseId, no references to remove`);
      return { success: true, message: 'No course reference to remove' };
    }

    try {
      logger.info(`Removing lesson ${lessonId} references from course: ${courseId}`);

      // Get the course document
      const courseRef = db.collection('Courses').doc(courseId);
      const courseDoc = await courseRef.get();

      if (!courseDoc.exists) {
        logger.info(`Course ${courseId} not found, no references to remove`);
        return { success: true, message: 'Course not found' };
      }

      const courseData = courseDoc.data();
      if (!courseData) {
        logger.info(`Course ${courseId} has no data`);
        return { success: true, message: 'Course has no data' };
      }

      const batch = db.batch();
      let updatedTopicsCount = 0;

      // Remove lesson references from course topics
      if (courseData.topics && Array.isArray(courseData.topics)) {
        const updatedTopics = courseData.topics.map((topic: any) => {
          if (topic.items && Array.isArray(topic.items)) {
            const originalLength = topic.items.length;
            const updatedItems = topic.items.filter((item: any) =>
              !(item.type === 'LESSON' && item.id === lessonId)
            );

            if (updatedItems.length !== originalLength) {
              updatedTopicsCount += (originalLength - updatedItems.length);
            }

            return {
              ...topic,
              items: updatedItems
            };
          }
          return topic;
        });

        // Update the course with cleaned topics
        batch.update(courseRef, { topics: updatedTopics });
      }

      // Commit the batch update
      await batch.commit();

      logger.info(`Successfully removed ${updatedTopicsCount} lesson references from course: ${courseId}`);
      return {
        success: true,
        removedReferences: updatedTopicsCount,
        courseId: courseId
      };

    } catch (error) {
      logger.error(`Error removing lesson references for lesson ${lessonId}:`, error);
      throw new Error(`Failed to remove lesson references from course: ${courseId}`);
    }
  }
);
