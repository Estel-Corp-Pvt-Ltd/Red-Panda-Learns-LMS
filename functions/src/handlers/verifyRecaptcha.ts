import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";

// 🔐 Define secret key
const recaptchaSecret = defineSecret("RECAPTCHA_SECRET_KEY");

// ✅ Define the expected reCAPTCHA API response
interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  ["error-codes"]?: string[];
  [key: string]: any;
}

/**
 * 🔍 Verifies a Google reCAPTCHA token from the frontend.
 */
const verifyRecaptchaHandler = async (req: Request, res: Response): Promise<void> => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "Method Not Allowed" });
    return;
  }

  try {
    const token = req.body.token;
    logger.info("👉 Incoming reCAPTCHA request:", req.body);

    if (!token) {
      res.status(400).json({ success: false, message: "Missing token" });
      return;
    }

    const secret = recaptchaSecret.value();

    // ✅ Verify token with Google API
    const googleRes = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
      { method: "POST" }
    );

    const data = (await googleRes.json()) as RecaptchaResponse;
    logger.info("🔥 reCAPTCHA response:", data);

    if (data.success && (data.score ?? 0) >= 0.5) {
      res.json({
        success: true,
        score: data.score,
        action: data.action,
        hostname: data.hostname,
        challengedAt: data.challenge_ts,
        raw: data,
      });
    } else {
      res.status(400).json({
        success: false,
        score: data.score ?? null,
        action: data.action,
        hostname: data.hostname,
        challengedAt: data.challenge_ts,
        errors: data["error-codes"] || [],
        raw: data,
      });
    }
  } catch (err: any) {
    logger.error("❌ reCAPTCHA backend error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const verifyRecaptcha = onRequest(
  { region: "us-central1", secrets: [recaptchaSecret] },
  withMiddleware(corsMiddleware, verifyRecaptchaHandler)
);
