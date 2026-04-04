import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { enrollmentService } from "../services/enrollService";
import { lessonService } from "../services/lessonService";
import { userService } from "../services/userService";
import { USER_ROLE } from "../constants";

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

    // Fetch user role from Firestore (not available in auth token)
    const userResult = await userService.getUserById(user.uid);
    const userRole = userResult.success && userResult.data ? userResult.data.role : undefined;

    functions.logger.info("Fetching lesson", { uid: user.uid, role: userRole });

    // Get parameters from query string instead of path
    const lessonId = req.query.id as string;
    const type = ((req.query.type as string) || "lesson").toLowerCase();

    // Validate lesson ID
    if (!lessonId) {
      res.status(400).json({ error: "Lesson ID is required as query parameter: ?id=abc" });
      return;
    }

    if (!type || ["lesson"].indexOf(type) === -1) {
      res
        .status(400)
        .json({ error: "Invalid or missing type parameter. Allowed values: 'lesson'" });
      return;
    }

    functions.logger.info(`Fetching ${type} with ID: ${lessonId}`);

    const lessonResult = await lessonService.getLessonById(lessonId);

    if (!lessonResult.success || !lessonResult.data) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    functions.logger.info("Lesson fetched successfully", {
      lessonId: lessonResult.data.id,
      courseId: lessonResult.data.courseId,
    });
    functions.logger.info("User details for access check", { uid: user.uid, role: userRole });
    if (userRole !== USER_ROLE.ADMIN) {
      // Check if user is the instructor of the course
      let isInstructor = false;
      if (userRole === USER_ROLE.INSTRUCTOR || userRole === USER_ROLE.TEACHER) {
        const courseDoc = await admin
          .firestore()
          .collection("Courses")
          .doc(lessonResult.data.courseId)
          .get();
        const courseData = courseDoc.data();
        functions.logger.info("Instructor check", {
          courseExists: courseDoc.exists,
          courseInstructorId: courseData?.instructorId ?? "N/A",
          userUid: user.uid,
          match: courseData?.instructorId === user.uid,
        });
        if (courseDoc.exists && courseData?.instructorId === user.uid) {
          isInstructor = true;
        }
      } else {
        functions.logger.info("User role is not INSTRUCTOR/TEACHER, skipping instructor check", {
          role: userRole,
        });
      }

      if (!isInstructor) {
        functions.logger.info("Not instructor, checking enrollment", {
          uid: user.uid,
          courseId: lessonResult.data.courseId,
        });
        const enrollmentsResult = await enrollmentService.isUserEnrolledInCourse(
          user.uid,
          lessonResult.data.courseId
        );
        functions.logger.info("Enrollment check result", {
          success: enrollmentsResult.success,
          enrolled: enrollmentsResult.data,
          error: enrollmentsResult.error ?? "none",
        });

        if (!enrollmentsResult.success || !enrollmentsResult.data) {
          functions.logger.warn("Access denied", {
            uid: user.uid,
            role: userRole,
            courseId: lessonResult.data.courseId,
          });
          res.status(403).json({
            error: "Access denied - User not enrolled in this course",
            details: enrollmentsResult.error,
          });
          return;
        }
      } else {
        functions.logger.info("Access granted - user is the course instructor");
      }
    } else {
      functions.logger.info("Access granted - user is ADMIN");
    }
    res.status(200).json({
      success: true,
      data: lessonResult.data,
      type: type || "lesson", // Include the type in response
    });
  } catch (err: any) {
    console.error("❌ Get lesson failed:", err);
    res.status(500).json({
      error: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { details: err.message }),
    });
  }
}

// Export the function
export const getLessons = onRequest(
  {
    region: "us-central1",
  },
  withMiddleware(corsMiddleware, authMiddleware, getLessonsHandler)
);
