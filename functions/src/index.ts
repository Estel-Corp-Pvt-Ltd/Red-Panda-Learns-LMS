import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";

const recaptchaSecret = defineSecret("RECAPTCHA_SECRET");

export const verifyRecaptcha = onRequest(
  { region: "us-central1", secrets: [recaptchaSecret] },
  async (req, res) => {
    // ✅ CORS headers
    res.set("Access-Control-Allow-Origin", "*"); // ⚠️ restrict to your prod domain later
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ success: false, message: "Method Not Allowed" });
      return;
    }

    try {
      const token = req.body.token;
      logger.info("👉 Incoming body:", req.body);

      if (!token) {
        res.status(400).json({ success: false, message: "Missing token" });
        return;
      }

      const secret = recaptchaSecret.value(); // ✅ secure access to secret

      // Call Google verify API
      const googleRes = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
        { method: "POST" }
      );
      const data = await googleRes.json();

      logger.info("🔥 reCAPTCHA RAW response:", data);

      if (data.success && (data.score ?? 0) >= 0.5) {
        res.json({
          success: true,
          score: data.score,
          action: data.action,
          hostname: data.hostname,
          challengedAt: data["challenge_ts"],
          raw: data,
        });
      } else {
        res.status(400).json({
          success: false,
          score: data.score ?? null,
          action: data.action,
          hostname: data.hostname,
          challengedAt: data["challenge_ts"],
          errors: data["error-codes"] || [],
          raw: data, // full response for debug
        });
      }
    } catch (err) {
      logger.error("❌ reCAPTCHA backend error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);