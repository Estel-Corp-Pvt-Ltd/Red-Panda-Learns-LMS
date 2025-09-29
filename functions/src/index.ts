import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";

const recaptchaSecret = defineSecret("RECAPTCHA_SECRET");
import crypto from "crypto";
import Razorpay from "razorpay";



const razorpayKeyId = defineSecret("RAZORPAY_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");



// ------------------ Create Order ------------------
export const createOrder = onRequest(
  { region: "us-central1", secrets: [razorpayKeyId, razorpayKeySecret] },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS")  res.status(204).send("");
    if (req.method !== "POST")  res.status(405).send("Method not allowed");

    try {
      const { amount, currency, receipt } = req.body;

      const instance = new Razorpay({
        key_id: razorpayKeyId.value(),
        key_secret: razorpayKeySecret.value(),
      });

      const order = await instance.orders.create({
        amount, // in paise (100 INR = 10000)
        currency,
        receipt,
      });

      logger.info("✅ Order created:", order);

      res.json({
        success: true,
        order,
        key_id: razorpayKeyId.value(), // send only public key to client
      });
    } catch (err) {
      logger.error("❌ Failed to create Razorpay order:", err);
      res.status(500).json({ success: false, error: "Failed to create order" });
    }
  }
);

// ------------------ Verify Payment ------------------


export const verifyPayment = onRequest(
  { region: "us-central1", secrets: [razorpayKeySecret] },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS")  res.status(204).send("");
    if (req.method !== "POST")  res.status(405).send("Method not allowed");

    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transaction_id } = req.body;

      const body = razorpay_order_id + "|" + razorpay_payment_id;

      const expectedSignature = crypto
        .createHmac("sha256", razorpayKeySecret.value())
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        logger.info("✅ Payment verified:", { razorpay_order_id, razorpay_payment_id });
         res.json({ success: true, transaction_id });
      } else {
        logger.warn("❌ Invalid signature");
         res.status(400).json({ success: false, error: "Invalid signature" });
      }
    } catch (err) {
      logger.error("❌ Verification error:", err);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
);


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