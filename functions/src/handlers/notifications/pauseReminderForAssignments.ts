import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/v2/https";
import { reminderService } from "../../services/reminderService";

async function pauseReminderForAssignmentsHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Extract admin ID from the authenticated user token
    const adminId = user.uid; // Firebase Auth user ID

    if (!adminId) {
      res.status(401).json({ error: "Unable to identify admin from token" });
      return;
    }

    const { assignmentIds } = req.body;

    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      res.status(400).json({
        error: "Missing or invalid required fields: assignmentIds (array)",
      });
      return;
    }

    // Pass adminId to pause reminders only for THIS admin
    const paused = await reminderService.pauseRemindersForAssignments(
      assignmentIds,
      adminId
    );

    res.status(200).json({ success: true, data: paused });
  } catch (error: any) {
    console.error("❌ Pause reminders for assignments failed:", error);
    res.status(500).json({ error: "Internal error", details: error.message });
  }
}

export const pauseReminderForAssignments = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, pauseReminderForAssignmentsHandler)
);
