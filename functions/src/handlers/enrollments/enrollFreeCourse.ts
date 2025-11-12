import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/https";
import { userService } from "../../services/userService";
import { enrollmentService } from "../../services/enrollService";
import { getItemsDetails } from "../../utils/orderUtils";

if (!admin.apps.length) admin.initializeApp();


// ------------------ Enroll Free Course ------------------
async function enrollFreeCourseHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;

    // Logic Starts Here
    const courseId = req.body.courseId;
    if (!courseId || typeof courseId !== "string") {
      res.status(400).json({ error: "Course ID is required" });
      return;
    }

    const userResult = await userService.getUserById(user.uid);

    if (!userResult.success || !userResult.data) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { itemsDetails, originalAmount } = await getItemsDetails([{ itemType: "COURSE", itemId: courseId }]);
    if (!itemsDetails || itemsDetails.length === 0) {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (originalAmount > 0) {
      res.status(400).json({ error: "Course is not free" });
      return;
    }

    await enrollmentService.enrollUser(userResult.data, itemsDetails, "Free Course Enrollment");
    functions.logger.info("student enrolled in free course", { userEmail: userResult.data.email, itemsDetails });

    res.status(200).json({
      success: true,
      items: itemsDetails
    });
  } catch (err: any) {
    console.error("❌ Razorpay order creation failed:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}




export const enrollFreeCourse = onRequest({
  region: "us-central1",
}, withMiddleware(
  corsMiddleware,
  authMiddleware,
  enrollFreeCourseHandler
));
