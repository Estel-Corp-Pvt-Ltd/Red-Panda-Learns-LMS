import { onRequest } from "firebase-functions/v2/https";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { notificationService } from "../../services/notificationService";

export const getNotification = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, async (req, res) => {
    try {
      const { id } = req.query;

      if (!id) {
        res.status(400).json({ error: "Missing id" });
        return;
      }

      const notif = await notificationService.getById(String(id));

      if (!notif) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      res.status(200).json({ success: true, data: notif });

    } catch (err: any) {
      res.status(500).json({ error: "Internal error", details: err.message });
    }
  })
);
