import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/v2/https";
import { notificationService } from "../../services/notificationService";

// ------------------ Create Notification ------------------
async function createNotificationHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { submissionId, assignmentId, studentId, adminId, adminEmail } = req.body;

    if (!submissionId || !assignmentId || !studentId || !adminId || !adminEmail) {
      res.status(400).json({
        error: "Missing required fields: submissionId, assignmentId, studentId, adminId, adminEmail"
      });
      return;
    }

    const notif = await notificationService.createNotification({
      submissionId,
      assignmentId,
      studentId,
      adminId,
      adminEmail
    });

    res.status(200).json({ success: true, data: notif });

  } catch (err: any) {
    console.error("❌ Create notification failed:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message
    });
  }
}

export const createNotification = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, createNotificationHandler)
);
