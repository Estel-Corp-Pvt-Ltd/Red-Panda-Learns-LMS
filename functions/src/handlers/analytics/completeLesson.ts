import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/https";
import { lessonAnalyticsService } from "../../services/lessonAnalyticsService";
import { courseAnalyticsService } from "../../services/courseAnalyticsService";
import { learningProgressService } from "../../services/lessonProgressService";
import { lessonService } from "../../services/lessonService";
import { courseService } from "../../services/courseService";

if (!admin.apps.length) admin.initializeApp();

// ------------------ Create Order ------------------
async function completeLessonHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { lessonId, courseId } = req.body;

    if (!lessonId || !courseId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const lessonResult = await lessonService.getLessonById(lessonId);
    if (!lessonResult.success || !lessonResult.data) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    await learningProgressService.completeLesson(user.uid, courseId, lessonId, lessonResult.data.title);

    // Analytics updates
    await lessonAnalyticsService.updateLessonAnalytics({
      courseId,
      lessonId,
      completionIncrement: 1,
    });

    const courseResult = await courseService.getCourseById(courseId);
    if (courseResult.success && courseResult.data) {
      await courseAnalyticsService.updateCourseAnalytics({
        courseId,
        coursesCompletedIncrement: 1,
      });
    }


    await courseAnalyticsService.updateCourseAnalytics({
      courseId,
      coursesCompletedIncrement: 1,
    });

    functions.logger.info(`Updated time spent for lesson ${lessonId} in course ${courseId} by user ${user.uid}`);
    res.json({
      success: true,
    });
  } catch (err: any) {
    functions.logger.error("❌ lessonTimeSpentHandler error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}




export const completeLesson = onRequest({
  region: "us-central1",
}, withMiddleware(
  corsMiddleware,
  authMiddleware,
  completeLessonHandler
));
