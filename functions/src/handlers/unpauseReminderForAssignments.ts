import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import { onRequest } from "firebase-functions/v2/https";
import { reminderService } from "../services/reminderService";

async function unpauseReminderForAssignmentsHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { assignmentIds } = req.body;

    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      res.status(400).json({
        error: "Missing or invalid required fields: assignmentIds (array)",
      });
      return;
    }

    const paused = await reminderService.unpauseRemindersForAssignments(
     assignmentIds
    );

    res.status(200).json({ success: true, data: paused });
  } catch (error: any) {
    console.error("❌ Pause reminders for assignments failed:", error);
    res.status(500).json({ error: "Internal error", details: error.message });
  }
}

export const unpauseReminderForAssignments = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, unpauseReminderForAssignmentsHandler)
);
