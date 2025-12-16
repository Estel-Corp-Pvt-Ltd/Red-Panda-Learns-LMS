import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/v2/https";
import announcementService from "../../services/announcementService";

async function updateAnnouncementHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const announcementId = req.query.announcementId as string;
    const { title, body } = req.body;

    // Validation
    if (!announcementId) {
      res.status(400).json({
        error: "Missing required parameter: announcementId",
      });
      return;
    }

    if (!title && !body) {
      res.status(400).json({
        error: "At least one field required: title or body",
      });
      return;
    }

    // Build updates object with only provided fields
    const updates: Partial<{ title: string; body: string }> = {};
    if (title) updates.title = title;
    if (body) updates.body = body;

    // Call service
    const result = await announcementService.updateAnnouncement(
      announcementId,
      updates
    );

    // Handle Result type
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
    });
  } catch (error: any) {
    console.error("❌ Update announcement failed:", error);
    res.status(500).json({ error: "Internal error", details: error.message });
  }
}

export const updateAnnouncement = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, updateAnnouncementHandler)
);
