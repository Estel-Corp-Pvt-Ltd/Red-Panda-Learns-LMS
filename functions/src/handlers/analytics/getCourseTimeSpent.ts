import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/https";
import { learningProgressService } from "../../services/learningProgressService";

if (!admin.apps.length) admin.initializeApp();

// ------------------ Get Total Time Spent for Course ------------------
async function courseTimeSpentHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user && user?.role !== 'ADMIN') {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { courseId, userId } = req.body;

    if (!courseId || !userId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const lessonResult = await learningProgressService.getUserCourseProgress(userId, courseId);

    if (!lessonResult.success || !lessonResult.data) {
      res.status(404).json({ error: "Learning progress not found" });
      return;
    }

    const progressData = lessonResult.data[0];
    const lessonHistory = progressData.lessonHistory;

    let totalTimeSpentSec = 0;

    if (lessonHistory && typeof lessonHistory === 'object') {
      // Handle object format (based on your LearningProgress interface)
      // lessonHistory is { [lessonId: string]: { timeSpent: number, ... } }
      for (const lessonId in lessonHistory) {
        const lesson = lessonHistory[lessonId];
        if (lesson && typeof lesson.timeSpent === 'number') {
          totalTimeSpentSec += lesson.timeSpent;
        }
      }
    }

    functions.logger.info(`Retrieved total time spent for course ${courseId} by user ${userId}: ${totalTimeSpentSec} seconds`);

    res.json({
      success: true,
      data: {
        lessonHistory,
        totalTimeSpentSec,
        courseId,
        userId
      }
    });

  } catch (err: any) {
    functions.logger.error("❌ courseTimeSpentHandler error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}

export const getCourseTimeSpent = onRequest({
  region: "us-central1",
}, withMiddleware(
  corsMiddleware,
  authMiddleware,
  courseTimeSpentHandler
));
