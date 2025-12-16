import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/v2/https";
import announcementService from "../../services/announcementService";

async function deleteAnnouncementHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

      const announcementId = req.query.announcementId as string;

    // Validation
    if (!announcementId) {
      res.status(400).json({
        error: "Missing required parameter: announcementId",
      });
      return;
    }

    // Call service
    const result = await announcementService.deleteAnnouncement(announcementId);

    // Handle Result type
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Delete announcement failed:", error);
    res.status(500).json({ error: "Internal error", details: error.message });
  }
}

export const deleteAnnouncement = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, deleteAnnouncementHandler)
);