import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
// Correct Node.js crypto import
import * as crypto from "crypto";
// import { transactionService } from "../../src/services/transactionService";
// import { PAYMENT_PROVIDER } from "../../src/constants"
const recaptchaSecret = defineSecret("RECAPTCHA_SECRET");
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import Razorpay from "razorpay";
import { CURRENCY } from "../../src/constants";
import { PayPalAccessToken } from "../src/types/paypalConfig";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const razorpayKeyId = defineSecret("RAZORPAY_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");

function validateAmount(amount: any): number {
  if (typeof amount !== "number" || isNaN(amount)) {
    throw new Error("Invalid amount: must be a number");
  }

  if (amount <= 0) {
    throw new Error("Invalid amount: must be a positive integer");
  }

  if (amount >= 100000000) {
    throw new Error("Invalid amount: exceeds maximum allowed");
  }

  if (!Number.isInteger(amount)) {
    throw new Error("Invalid amount: must be an integer");
  }

  return amount;
}

function validateCurrency(currency: any): string {
  const allowed = Object.values(CURRENCY);;
  if (!allowed.includes(currency)) throw new Error("Invalid currency");
  return currency;
}

// ------------------ Create Order ------------------
// Temporary in-memory cache (use Firestore/Redis for production)
const idempotencyCache = new Map<string, any>();

// ------------------ Create Order ------------------
export const createOrder = onRequest(
  { region: "us-central1", secrets: [razorpayKeyId, razorpayKeySecret] },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET , POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    try {
      // Grab idempotency key
      const idempotencyKey = req.get("Idempotency-Key");
      if (!idempotencyKey) {
        res
          .status(400)
          .json({ success: false, error: "Missing Idempotency-Key header" });
        return;
      }

      // If we've seen this key, return cached response
      if (idempotencyCache.has(idempotencyKey)) {
        console.log(`♻️ Returning cached order for key: ${idempotencyKey}`);
        res.json(idempotencyCache.get(idempotencyKey));
        return;
      }

      // Debug log
      console.log("📥 Incoming raw body:", req.body);

      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          throw new Error("Invalid JSON body");
        }
      }

      const { rawamount, rawcurrency, receipt } = body;

      const rawamountNum = Number(rawamount);
      if (!rawamount || isNaN(rawamountNum)) {
        throw new Error(
          `Invalid amount: rawamount could not be converted to number (got ${rawamount})`
        );
      }

      const amountInPaise = Math.round(rawamountNum * 100);
      const amount = validateAmount(amountInPaise);
      const currency = validateCurrency(rawcurrency);

      const instance = new Razorpay({
        key_id: razorpayKeyId.value(),
        key_secret: razorpayKeySecret.value(),
      });

      const order = await instance.orders.create({
        amount,
        currency,
        receipt,
        payment_capture: 1 as any,
      });

      console.log("✅ Order created:", order);

      const response = {
        success: true,
        order,
        key_id: razorpayKeyId.value(),
      };

      // Cache response for this idempotency key
      idempotencyCache.set(idempotencyKey, response);

      res.json(response);
    } catch (err: any) {
      console.error("❌ Failed to create Razorpay order:", err);
      res
        .status(500)
        .json({
          success: false,
          error: err.message || "Failed to create order",
        });
      return;
    }
  }
);

// ------------------ Verify Payment ------------------

export const verifyPayment = onRequest(
  { region: "us-central1", secrets: [razorpayKeyId, razorpayKeySecret] },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        transaction_id,
      } = req.body;

      console.log("🔎 Incoming verifyPayment body:", req.body);

      // Step 1: Validate HMAC signature
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac("sha256", razorpayKeySecret.value())
        .update(body)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        console.warn("❌ Invalid signature", {
          expectedSignature,
          razorpay_signature,
        });
        res.status(400).json({ success: false, error: "Invalid signature" });
        return;
      }

      // Step 2: Check transaction record in DB
      const txnRef = db.collection("Transactions").doc(transaction_id);
      const txnSnap = await txnRef.get();

      if (!txnSnap.exists) {
        console.warn("❌ Transaction not found:", transaction_id);
        res
          .status(404)
          .json({ success: false, error: "Transaction not found" });
        return;
      }

      const txn = txnSnap.data()!;
      console.log("✅ Transaction fetched from DB:", txn);

      if (txn.status === "COMPLETED") {
        console.log(
          "ℹ️ Transaction already completed, returning success (idempotent)"
        );
        res.json({ success: true, transaction_id });
        return;
      }

      // Step 3: Cross-check with Razorpay API
      const instance = new Razorpay({
        key_id: razorpayKeyId.value(),
        key_secret: razorpayKeySecret.value(),
      });

      let payment;
      try {
        payment = await instance.payments.fetch(razorpay_payment_id);
        console.log("✅ Razorpay payment fetched:", payment);
      } catch (fetchErr) {
        console.error("❌ Razorpay fetch failed:", fetchErr);
        res.status(400).json({ success: false, error: "Invalid payment ID" });
        return;
      }

      if (payment.status !== "captured") {
        res.status(400).json({ success: false, error: "Payment not captured" });
        return;
      }

      // Step 4: Update transaction as completed
      // await txnRef.update({
      //   status: "COMPLETED",
      //   razorpay_order_id,
      //   razorpay_payment_id,
      //   razorpay_signature,
      //   completedAt: Date.now(),
      // });

      console.log("✅ Transaction updated to COMPLETED:", transaction_id);
      res.json({ success: true, transaction_id });
      return;
    } catch (error) {
      console.error("❌ Verification crash:", error);
      res.status(500).json({ success: false, error: "Server error" });
      return;
    }
  }
);

// ------------------ PayPal Provider ------------------

// Secrets
const paypalClientId = defineSecret("PAYPAL_CLIENT_ID");
const paypalClientSecret = defineSecret("PAYPAL_CLIENT_SECRET");

// Local idempotency cache
const paypalIdempotencyCache = new Map<string, any>();

export async function getPayPalAccessToken(): Promise<string> {
  const tokenRef = db.collection("config").doc("paypal_access_token");

  logger.info("🔍 Checking existing PayPal access token in Firestore...");
  const tokenSnap = await tokenRef.get();

  if (tokenSnap.exists) {
    const data = tokenSnap.data() as PayPalAccessToken;
    const now = admin.firestore.Timestamp.now();
    const remainingMs = data.expiresAt.toMillis() - now.toMillis();

    logger.info("📄 Existing token found:", {
      expiresAt: data.expiresAt.toDate().toISOString(),
      remainingMinutes: Math.floor(remainingMs / 60000),
    });

    // If still valid for > 1 min, reuse it
    if (remainingMs > 60 * 1000) {
      logger.info("✅ Reusing existing PayPal access token.");
      return data.token;
    } else {
      logger.warn("⚠️ Token is expired or expiring soon — generating a new one.");
    }
  } else {
    logger.info("ℹ️ No existing PayPal token found — generating a new one.");
  }

  // ---------------------- Generate new token ----------------------
  const newToken: string = await generateAccessToken();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 32400 * 1000); // 9h validity

  await tokenRef.set({ token: newToken, expiresAt }, { merge: true });

  logger.info("💾 New PayPal token saved to Firestore:", {
    docPath: tokenRef.path,
    expiresAt: expiresAt.toDate().toISOString(),
  });

  return newToken;
}


// ----------------------------------------------------------------
// Helper to get access token from PayPal
async function generateAccessToken(): Promise<string> {
  const base = "https://api-m.sandbox.paypal.com"; // switch to live in prod
  const auth = Buffer.from(
    paypalClientId.value() + ":" + paypalClientSecret.value()
  ).toString("base64");

  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!response.ok) {
    const err = await response.text();
    logger.error("❌ Failed to fetch PayPal access token:", err);
    throw new Error(`PayPal access token fetch failed: ${err}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in?: number };
  logger.info("🔑 Successfully generated new PayPal access token.");
  return data.access_token;
}
// ---------------- Create PayPal Order ----------------
export const createPaypalOrder = onRequest(
  { region: "us-central1", secrets: [paypalClientId, paypalClientSecret] },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ success: false, message: "Method not allowed" });
      return;
    }

    try {
      const idempotencyKey = req.get("Idempotency-Key");
      if (!idempotencyKey) {
        res
          .status(400)
          .json({ success: false, error: "Missing Idempotency-Key header" });
        return;
      }

      if (paypalIdempotencyCache.has(idempotencyKey)) {
        console.log(
          `♻️ Returning cached PayPal order for key: ${idempotencyKey}`
        );
        res.json(paypalIdempotencyCache.get(idempotencyKey));
        return;
      }

      const { rawamount, rawcurrency, description, transactionId } = req.body;

      const amount = validateAmount(rawamount);
      const currency = validateCurrency(rawcurrency);

      const accessToken = await generateAccessToken();
      const base = "https://api-m.sandbox.paypal.com"; // sandbox by default

      const orderResponse = await fetch(`${base}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: (amount / 100).toFixed(2), // PayPal expects string amount like "10.00"
              },
              description,
              custom_id: transactionId,
            },
          ],
          application_context: {
            shipping_preference: "NO_SHIPPING",
          },
        }),
      });

      const order = await orderResponse.json();
      console.log("✅ PayPal Order created:", order);

      // Store transaction in Firestore
      const txnRef = db.collection("Transactions").doc(transactionId);
      await txnRef.set(
        {
          status: "PENDING",
          provider: "PAYPAL",
          expectedAmount: amount,
          currency,
          createdAt: Date.now(),
        },
        { merge: true }
      );

      const response = {
        success: true,
        order,
        clientId: paypalClientId.value(),
      };

      paypalIdempotencyCache.set(idempotencyKey, response);
      res.json(response);
      return;
    } catch (err: any) {
      console.error("❌ Failed to create PayPal order:", err);
      res
        .status(500)
        .json({
          success: false,
          error: err.message || "Failed to create order",
        });
      return;
    }
  }
);

// ---------------- Capture PayPal Order ----------------
export const capturePaypalOrder = onRequest(
  { region: "us-central1", secrets: [paypalClientId, paypalClientSecret] },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ success: false, message: "Method not allowed" });
      return;
    }

    try {
      const { orderId, transactionId } = req.body;

      const accessToken = await generateAccessToken();
      const base = "https://api-m.sandbox.paypal.com";

      const captureResponse = await fetch(
        `${base}/v2/checkout/orders/${orderId}/capture`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const captureData = await captureResponse.json();
      console.log("✅ PayPal Order capture response:", captureData);

      if (captureResponse.ok) {
        // Update Firestore transaction
        const txnRef = db.collection("Transactions").doc(transactionId);
        await txnRef.update({
          status: "COMPLETED",
          paypal_order_id: orderId,
          captureData,
          completedAt: Date.now(),
        });

        res.json({ success: true, capture: captureData });
        return;
      } else {
        console.error("❌ PayPal capture failed:", captureData);
        res.status(400).json({ success: false, error: captureData });
        return;
      }
    } catch (err) {
      console.error("❌ Failed to capture PayPal order:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to capture order" });
      return;
    }
  }
);

// ✅ Define the expected reCAPTCHA API response
interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  ["error-codes"]?: string[];
  [key: string]: any; // fallback
}

export const verifyRecaptcha = onRequest(
  { region: "us-central1", secrets: [recaptchaSecret] },
  async (req, res) => {
    // ✅ CORS headers
    res.set("Access-Control-Allow-Origin", "*"); // ⚠️ restrict to prod domain later
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

      const secret = recaptchaSecret.value();

      // ✅ Call Google verify API
      const googleRes = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
        { method: "POST" }
      );

      const data = (await googleRes.json()) as RecaptchaResponse;
      logger.info("🔥 reCAPTCHA RAW response:", data);

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
          raw: data, // full response for debug
        });
      }
    } catch (err) {
      logger.error("❌ reCAPTCHA backend error:", err);
      res.status(500).json({ success: false, message: "Server error" });
      return;
    }
  }
);
