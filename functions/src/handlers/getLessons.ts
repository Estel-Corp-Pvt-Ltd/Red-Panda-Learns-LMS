import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { enrollmentService } from "../services/enrollService";
import { lessonService } from "../services/lessonService";

// Initialize Firebase Admin (moved outside function scope)
if (!admin.apps.length) {
  admin.initializeApp();
}

// ------------------ Get Lesson ------------------
async function getLessonsHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;

    // Validate user authentication
    if (!user) {
      res.status(401).json({ error: "Unauthorized - User not authenticated" });
      return;
    }

    functions.logger.info("Fetching lesson", { user: user });

    // Get parameters from query string instead of path
    const lessonId = req.query.id as string;
    const type = (req.query.type as string || "lesson").toLowerCase();

    // Validate lesson ID
    if (!lessonId) {
      res.status(400).json({ error: "Lesson ID is required as query parameter: ?id=abc" });
      return;
    }

    if (!type || ['lesson'].indexOf(type) === -1) {
      res.status(400).json({ error: "Invalid or missing type parameter. Allowed values: 'lesson'" });
      return;
    }

    functions.logger.info(`Fetching ${type} with ID: ${lessonId}`);

    const lessonResult = await lessonService.getLessonById(lessonId);

    if (!lessonResult.success || !lessonResult.data) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    functions.logger.info("Lesson fetched successfully", { lesson: lessonResult.data });
    if (user.role !== "ADMIN") {
      // Check if user is enrolled in the course
      const enrollmentsResult = await enrollmentService.isUserEnrolledInCourse(
        user.uid,
        lessonResult.data.courseId
      );

      if (!enrollmentsResult.success || !enrollmentsResult.data) {
        res.status(403).json({
          error: "Access denied - User not enrolled in this course",
          details: enrollmentsResult.error
        });
        return;
      }
    }
    res.status(200).json({
      success: true,
      data: lessonResult.data,
      type: type || 'lesson' // Include the type in response
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
export const getLessons = onRequest({
  region: "us-central1",
}, withMiddleware(
  corsMiddleware,
  authMiddleware,
  getLessonsHandler
));
