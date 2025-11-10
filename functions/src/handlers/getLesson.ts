import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { enrollmentService } from "../services/enrollService";
import { lessonService } from "../services/lessonService";

// Initialize Firebase Admin (moved outside function scope)
if (!admin.apps.length) {
  admin.initializeApp();
}

// ------------------ Get Lesson ------------------
async function getLessonHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;

    // Validate user authentication
    if (!user || !user.id) {
      res.status(401).json({ error: "Unauthorized - User not authenticated" });
      return;
    }

    const lessonId = req.params.id;

    // Validate lesson ID
    if (!lessonId) {
      res.status(400).json({ error: "Lesson ID is required" });
      return;
    }

    const lessonResult = await lessonService.getLessonById(lessonId);

    if (!lessonResult.success || !lessonResult.data) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    // Check if user is enrolled in the course
    const enrollmentsResult = await enrollmentService.isUserEnrolledInCourse(
      user.id,
      lessonResult.data.courseId
    );

    if (!enrollmentsResult.success || !enrollmentsResult.data) {
      res.status(403).json({
        error: "Access denied - User not enrolled in this course",
        details: enrollmentsResult.error
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: lessonResult.data,
    });

  } catch (err: any) {
    console.error("❌ Get lesson failed:", err);
    res.status(500).json({
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
}

// Export the function
export const getLesson = onRequest({
  region: "us-central1",
}, withMiddleware(
  corsMiddleware,
  authMiddleware,
  getLessonHandler
));
