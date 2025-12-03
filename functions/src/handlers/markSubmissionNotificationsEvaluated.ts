import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import { onRequest } from "firebase-functions/v2/https";
import { notificationService } from "../services/notificationService";

async function markSubmissionNotificationsEvaluatedHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { submissionId } = req.body;

    if (!submissionId) {
      res.status(400).json({
        error: "Missing or invalid required field: submissionId",
      });
      return;
    }

    // This function internally logs and rethrows errors 
    await notificationService.markSubmissionNotificationsEvaluated(submissionId);

    res.status(200).json({
      success: true,
      message: "Submission notifications marked as evaluated",
    });

  } catch (error: any) {
    console.error("❌ Mark submission notifications evaluated failed:", error);

    res.status(500).json({
      error: "Internal error",
      details: error.message,
    });
  }
}

export const markSubmissionNotificationsEvaluated = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, markSubmissionNotificationsEvaluatedHandler)
);
