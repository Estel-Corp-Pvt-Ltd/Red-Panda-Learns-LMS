import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { onRequest } from "firebase-functions/v2/https";
import { notificationService } from "../../services/notificationService";

export const sendInitialNotification = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        res.status(400).json({ error: "Missing notification id" });
        return;
      }

      const result = await notificationService.sendInitialEmail(id);
      res.status(200).json({ success: true, result });

    } catch (err: any) {
      console.error("❌ Failed to send initial email:", err);
      res.status(500).json({ error: "Internal error", details: err.message });
    }
  })
);
