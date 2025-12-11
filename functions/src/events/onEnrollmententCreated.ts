import * as functions from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/firestore";
import { COLLECTION } from "../constants";
import { courseAnalyticsService } from "../services/courseAnalyticsService";
import { enrollmentService } from "../services/enrollService";
import { courseService } from "../services/courseService";
import { lessonAnalyticsService } from "../services/lessonAnalyticsService";

export const onEnrollmententCreated = onDocumentCreated(
  `${COLLECTION.ENROLLMENTS}/{id}`,
  async (event) => {
    const enrollmentId = event.params.id;
    functions.logger.info(`New enrollment created with ID: ${enrollmentId}`, event.params);

    try {
      const enrollmentData = await enrollmentService.getEnrollmentById(enrollmentId);
      if (!enrollmentData.success || !enrollmentData.data) {
        functions.logger.error(`Enrollment data not found for ID: ${enrollmentId}`);
        return;
      }


      const courseResult = await courseService.getCourseById(enrollmentData.data.courseId);
      if (!courseResult.success || !courseResult.data) {
        functions.logger.error(`Course data not found for ID: ${enrollmentData.data.courseId}`);
        return;
      }

      await courseAnalyticsService.updateCourseAnalytics({
        courseId: enrollmentData.data.courseId,
        courseTitle: courseResult.data.title,
        learnerIncrement: 1,
      });

      courseResult.data.topics.forEach(topic => {
        topic.items.forEach(async item => {
          if (item.type === "LESSON") {
            await lessonAnalyticsService.updateLessonAnalytics({
              courseId: enrollmentData.data.courseId,
              courseTitle: courseResult.data?.title,
              lessonId: item.id,
              lessonTitle: item.title,
              learnersIncrement: 1,
            });
          }
        });
      });
    } catch (err) {
      functions.logger.error(`❌ Exception while processing enrollment creation ${enrollmentId}:`, err);
    }
  }
);
