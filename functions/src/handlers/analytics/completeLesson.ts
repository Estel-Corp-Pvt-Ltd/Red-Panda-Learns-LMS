import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/https";
import { lessonAnalyticsService } from "../../services/lessonAnalyticsService";
import { learningProgressService } from "../../services/learningProgressService";
import { lessonService } from "../../services/lessonService";
import { LEARNING_CONTENT } from "../../constants";

if (!admin.apps.length) admin.initializeApp();

// ------------------ Create Order ------------------
async function completeLessonHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { itemId, courseId, type } = req.body;

    if (!itemId || !courseId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const lessonResult = await lessonService.getLessonById(itemId);
    if (!lessonResult.success || !lessonResult.data) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }
    if (type == LEARNING_CONTENT.ASSIGNMENT) {
      await learningProgressService.completeLesson(user.uid, courseId, itemId);
      res.json({
        success: true,
      });
      return;
    }
    await learningProgressService.completeLesson(user.uid, courseId, itemId);

    // Analytics updates
    await lessonAnalyticsService.updateLessonAnalytics({
      courseId,
      lessonId: itemId,
      completionIncrement: 1,
    });

    functions.logger.info(`Updated time spent for lesson ${itemId} in course ${courseId} by user ${user.uid}`);
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
