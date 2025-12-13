import { Request, Response } from "express";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/v2/https";
import { sendAnnouncementEmailonDocCreation } from "./sendAnnouncementMailonDocumentCreation";

async function sendAnnouncementEmailonRequestHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { announcementId } = req.body;

    // Validation
    if (!announcementId) {
      res.status(400).json({
        error: "Missing required fields: announcementId",
      });
      return;
    }

    try {
      const result = await sendAnnouncementEmailonDocCreation(announcementId);

      if (result.success) {
        console.log("📧 Email sent successfully for:", announcementId);
        res.status(200).json({ message: "Email sent successfully" });
      } else {
        console.error(`❌ Failed to send email for ${announcementId}:`, result.error);
        res.status(500).json({ error: `Failed to send email: ${result.error}` });
      }
    } catch (err) {
      console.error("❌ Exception while sending email:", err);
      res.status(500).json({ error: "An error occurred while sending the email" });
    }
  } catch (err) {
    console.error("❌ General error:", err);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
}

export const sendAnnouncementEmailonRequest = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, sendAnnouncementEmailonRequestHandler)
);
