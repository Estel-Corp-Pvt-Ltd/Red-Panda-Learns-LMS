import { onRequest } from "firebase-functions/v2/https";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { notificationService } from "../../services/notificationService";

export const archiveNotification = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, async (req, res) => {
    try {
      const { id } = req.body;

      if (!id) {
        res.status(400).json({ error: "Missing notification id" });
        return;
      }

      await notificationService.archive(id);

      res.status(200).json({ success: true });

    } catch (err: any) {
      res.status(500).json({ error: "Internal error", details: err.message });
    }
  })
);
