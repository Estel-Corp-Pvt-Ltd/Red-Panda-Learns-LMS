import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import { onRequest } from "firebase-functions/v2/https";
import { assignStudentsService } from "../services/assignStudentsService";

async function pauseStudentNotificationsforSpecificStudents(
  req: Request,
  res: Response
) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { adminId, studentIds } = req.body;

    if (!adminId || !Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({
        error:
          "Missing or invalid required fields: adminId, studentIds (array)",
      });
      return;
    }

    const assigned =
      await assignStudentsService.pauseNotificationForSpecificStudents(
        adminId,
        studentIds
      );

    res.status(200).json({ success: true, data: assigned });
  } catch (error: any) {
    console.error("❌ Assign students to admin failed:", error);
    res.status(500).json({ error: "Internal error", details: error.message });
  }
}

export const pauseStudentNotifications = onRequest(
  { region: "us-central1" },
  withMiddleware(
    corsMiddleware,
    authMiddleware,
    pauseStudentNotificationsforSpecificStudents
  )
);
