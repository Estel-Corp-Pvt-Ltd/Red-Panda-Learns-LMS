import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/https";
import { EnrollStudentSchema } from "../utils/validators";
import { defineSecret } from "firebase-functions/params";
import { userService } from "../services/userService";
import { enrollmentService } from "../services/enrollService";
import { TransactionLineItem } from "../types/transaction";
import { courseService } from "../services/courseService";

if (!admin.apps.length) admin.initializeApp();

const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_SECRET_KEY = defineSecret("RAZORPAY_KEY_SECRET");

// ------------------ Enroll Student ------------------
async function enrollStudentHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "ADMIN") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    functions.logger.info("student enrolled by admin", { admin: user });

    // Logic Starts Here
    const result = EnrollStudentSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid request", details: result.error });
      return;
    }

    const { userEmail, courseIds } = result.data;

    const userResult = await userService.getUserByEmail(userEmail);

    if (!userResult.success || !userResult.data) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const courses: TransactionLineItem[] = [];

    for (const courseId of courseIds) {
      const courseResponse = await courseService.getCourseById(courseId);
      if (courseResponse.success && courseResponse.data) {
        const course = courseResponse.data;
        courses.push({
          itemId: course.id,
          amount: course.salePrice,
          itemType: "COURSE",
          name: course.title,
          originalAmount: course.regularPrice
        });
      }
    }

    await enrollmentService.enrollUser(userResult.data, courses, "Admin Enrollment");
    functions.logger.info("student enrolled by admin", { userEmail, courseIds, admin: user });

    res.status(200).json({
      success: true,
      enrolledCourses: courses
    });
  } catch (err: any) {
    console.error("❌ Razorpay order creation failed:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}




export const enrollStudent = onRequest({
  region: "us-central1",
  secrets: [RAZORPAY_KEY_ID, RAZORPAY_SECRET_KEY]
}, withMiddleware(
  corsMiddleware,
  authMiddleware,
  enrollStudentHandler
));
