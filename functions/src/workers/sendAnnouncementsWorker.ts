// sendMailWorkerForNotif.ts
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import fetch from "node-fetch";

// 🔐 Define the secrets
const BREVO_API_KEY = defineSecret("BREVO_API_KEY");
const FALLBACK_EMAILS = defineSecret("FALLBACK_EMAILS"); // comma-separated emails

export const sendAnnouncementEmailWorker = onMessagePublished(
  {
    topic: "send-announcements",
    secrets: [BREVO_API_KEY, FALLBACK_EMAILS],
  },
  async (event) => {
    const apiKey = BREVO_API_KEY.value();
    const fallbackEmails = FALLBACK_EMAILS.value()
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    const payload = event.data.message.json;

    try {
      if (!payload) {
        logger.error("❌ Worker received empty payload");
        return;
      }

      const {
        to,
        bcc,
        subject,
        html,
        text,
        senderName,
        senderEmail,
      } = payload;

      // ────────────────────────────────────────────
      // Validate recipients
      // ────────────────────────────────────────────

      const safeTo = Array.isArray(to) ? to.filter(Boolean) : [];
      const safeBcc = Array.isArray(bcc) ? bcc.filter(Boolean) : [];

      // If 'to' is empty, use fallback emails
      if (safeTo.length === 0) {
        safeTo.push(...fallbackEmails);
        logger.info(
          "No 'to' recipients found, using fallback emails:",
          fallbackEmails
        );
      }

      if (safeTo.length === 0) {
        logger.warn("⚠️ No recipients available after fallback, skipping email");
        return;
      }

      // ────────────────────────────────────────────
      // Fallback sender
      // ────────────────────────────────────────────

      const sender = {
        name: senderName || "Vizuara",
        email: senderEmail || "no_reply@vizuara.com",
      };

      // ────────────────────────────────────────────
      // Plain text fallback
      // ────────────────────────────────────────────

      const textContent = text || (html ? html.replace(/<[^>]+>/g, "") : "");

      // ────────────────────────────────────────────
      // Build Brevo payload
      // ────────────────────────────────────────────

      const body = {
        sender,
        to: safeTo.map((email: string) => ({ email })),
        bcc: safeBcc.map((email: string) => ({ email })),
        subject,
        htmlContent: html || "",
        textContent,
      };

      logger.info("📧 Worker sending email batch", {
        toCount: safeTo.length,
        bccCount: safeBcc.length,
        subject,
      });

      // ────────────────────────────────────────────
      // Call Brevo
      // ────────────────────────────────────────────

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const respText = await res.text();
        throw new Error(`Brevo API failed (${res.status}): ${respText}`);
      }

      logger.info("✅ Worker batch sent successfully", {
        toCount: safeTo.length,
        bccCount: safeBcc.length,
        subject,
      });

    } catch (err: any) {
      logger.error("❌ Worker email sending failed:", {
        message: err.message,
        stack: err.stack,
        payload,
      });
    }
  }
);
