import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/https";
import { courseAnalyticsService } from "../../services/courseAnalyticsService";
import { courseService } from "../../services/courseService";
import { learningProgressService } from "../../services/learningProgressService";

if (!admin.apps.length) admin.initializeApp();

// ------------------ Complete Course ------------------
async function completeCourseHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { courseId } = req.body;

    if (!courseId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const courseResult = await courseService.getCourseById(courseId);
    if (!courseResult.success || !courseResult.data) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    const totalItems = courseResult.data.topics.flatMap(topic => topic.items).length;
    const completeCourseResult = await learningProgressService.completeCourse(user.uid, courseId, totalItems);
    if (!completeCourseResult.success) {
      res.status(400).json({ error: completeCourseResult.error.message || "Failed to complete course" });
      return;
    }
    // Analytics updates
    await courseAnalyticsService.updateCourseAnalytics({
      courseId,
      courseTitle: courseResult.data.title,
      coursesCompletedIncrement: 1,
    });
    res.json({
      success: true,
    });
  } catch (err: any) {
    functions.logger.error("❌ lessonTimeSpentHandler error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}




export const completeCourse = onRequest({
  region: "us-central1",
}, withMiddleware(
  corsMiddleware,
  authMiddleware,
  completeCourseHandler
));
