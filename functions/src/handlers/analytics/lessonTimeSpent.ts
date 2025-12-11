import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/https";
import { lessonAnalyticsService } from "../../services/lessonAnalyticsService";
import { courseAnalyticsService } from "../../services/courseAnalyticsService";

if (!admin.apps.length) admin.initializeApp();

// ------------------ Create Order ------------------
async function lessonTimeSpentHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { lessonId, courseId, timeSpentSec } = req.body;

    if (!lessonId || !courseId || !timeSpentSec) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    await lessonAnalyticsService.updateLessonAnalytics({
      courseId,
      lessonId,
      timeSpentSec,
    });

    await courseAnalyticsService.updateCourseAnalytics({
      courseId,
      timeSpentSec
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




export const lessonTimeSpent = onRequest({
  region: "us-central1",
}, withMiddleware(
  corsMiddleware,
  authMiddleware,
  lessonTimeSpentHandler
));
