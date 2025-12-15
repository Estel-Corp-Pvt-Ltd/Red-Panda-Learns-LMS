import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import { onRequest } from "firebase-functions/v2/https";
import announcementService from "../services/announcementService";

async function createGlobalAnnouncementHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { title, body, status } = req.body;

    // Validation
    if (!title || !body) {
      res.status(400).json({
        error: "Missing required fields: title, body",
      });
      return;
    }

    // Call service with params
    const result = await announcementService.createGlobalAnnouncement({
      title,
      body,
      createdBy: user.uid, // ✅ Pass the admin's UID
      status, // optional - will use default if not provided
    });

    // Handle Result type
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(201).json({ 
      success: true, 
      data: { announcementId: result.data } 
    });
  } catch (error: any) {
    console.error("❌ Create global announcement failed:", error);
    res.status(500).json({ error: "Internal error", details: error.message });
  }
}

export const createGlobalAnnouncement = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, createGlobalAnnouncementHandler)
);