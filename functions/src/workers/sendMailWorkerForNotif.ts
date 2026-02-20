// sendMailWorkerForNotif.ts
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import fetch from "node-fetch";

const BREVO_API_KEY = defineSecret("BREVO_API_KEY");

export const SendMailWorkerForNotif = onMessagePublished(
  {
    topic: "send-mail-notif",
    secrets: [BREVO_API_KEY],
  },
  async (event) => {
    try {
      const payload = event.data.message.json;
      logger.info("📧 Worker received mail payload:", payload);
      const apiKey = BREVO_API_KEY.value();

      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          sender: { name: "RedPanda Learns", email: "no_reply@RedPanda Learns.com" },
          to: [{ email: payload.to }],
          subject: payload.subject,
          htmlContent: payload.html,
          textContent: payload.text || payload.html.replace(/<[^>]+>/g, ""),
        }),
      });

      logger.info("✅ Email sent successfully via worker:", payload.to);
    } catch (err: any) {
      logger.error("❌ Worker email sending failed:", err);
    }
  }
);
