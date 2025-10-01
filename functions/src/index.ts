import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
// Correct Node.js crypto import
import * as crypto from "crypto";
// import { transactionService } from "../../src/services/transactionService";
// import { PAYMENT_PROVIDER } from "../../src/constants"
const recaptchaSecret = defineSecret("RECAPTCHA_SECRET");


import fetch from "node-fetch";  
import Razorpay from "razorpay";



const razorpayKeyId = defineSecret("RAZORPAY_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");



function validateAmount(amount: any): number {
  if (typeof amount !== "number" || isNaN(amount)) {
    throw new Error("Invalid amount: must be a number");
  }

  if (amount <= 0) {
    throw new Error("Invalid amount: must be a positive integer");
  }

  if (amount >= 1000000) {
    throw new Error("Invalid amount: exceeds maximum allowed");
  }

  if (!Number.isInteger(amount)) {
    throw new Error("Invalid amount: must be an integer");
  }

  return amount;
}



function validateCurrency(currency: any): string {
  const allowed = ["USD", "INR"];
  if (!allowed.includes(currency)) throw new Error("Invalid currency");
  return currency;
}




// ------------------ Create Order ------------------
export const createOrder = onRequest(
  { region: "us-central1", secrets: [razorpayKeyId, razorpayKeySecret] },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS"){  res.status(204).send(""); return};
    if (req.method !== "POST") { res.status(405).send("Method not allowed");return};

    try {
      const { rawamount, rawcurrency, receipt } = req.body;

      const amountinpaise = Math.round(rawamount * 100);
      const amount = validateAmount(amountinpaise)
      const currency = validateCurrency(rawcurrency)
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
      })
      return;
    } catch (err) {
      logger.error("❌ Failed to create Razorpay order:", err);
      res.status(500).json({ success: false, error: "Failed to create order" });
      return;
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

    if (req.method === "OPTIONS") { res.status(204).send("");return};
    if (req.method !== "POST")  {res.status(405).send("Method not allowed");return};

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
         return;
      }
    } catch (err) {
      logger.error("❌ Verification error:", err);
      res.status(500).json({ success: false, error: "Server error" });
      return;
    }
  }
);




// Secrets
const paypalClientId = defineSecret("PAYPAL_CLIENT_ID");
const paypalClientSecret = defineSecret("PAYPAL_CLIENT_SECRET");

// Helper to get access token from PayPal
async function generateAccessToken() {
  const base = "https://api-m.sandbox.paypal.com"; // switch to live in production
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
    throw new Error(`Failed to fetch access token: ${await response.text()}`);
  }


  const data = (await response.json()) as { access_token: string };
return data.access_token;
}

// ---------------- Create Order ----------------
export const createPaypalOrder = onRequest(
  { region: "us-central1", secrets: [paypalClientId, paypalClientSecret] },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS"){ 
       res.status(204).send("")
      ;return;};
    if (req.method !== "POST"){

       res.status(405).json({ success: false, message: "Method not allowed" });
      return;
      };

    try {
      const { rawamount, rawcurrency, description, transactionId } = req.body;

      const amount = validateAmount(rawamount)
      const currency = validateCurrency(rawcurrency)
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
                value: amount,
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

      logger.info("✅ PayPal Order created:", order);

      res.json({
        success: true,
        order,
        clientId: paypalClientId.value(), // safe to expose clientId
      });
      return;
    } catch (err) {
      logger.error("❌ Failed to create PayPal order:", err);
      res.status(500).json({ success: false, error: "Failed to create order" });
      return;
    }
  }
);

// ---------------- Capture Order ----------------
export const capturePaypalOrder = onRequest(
  { region: "us-central1", secrets: [paypalClientId, paypalClientSecret] },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") { 
      res.status(204).send("");
      return;
    };
    if (req.method !== "POST"){
       res.status(405).json({ success: false, message: "Method not allowed" });
      return;
      };

    try {
      const { orderId } = req.body;

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

      logger.info("✅ PayPal Order captured:", captureData);

      if (captureResponse.ok) {
   res.json({ success: true, capture: captureData });
   return;
      } else {
        res.status(400).json({ success: false, error: captureData });
        return;
      }
    } catch (err) {
      logger.error("❌ Failed to capture PayPal order:", err);
      res.status(500).json({ success: false, error: "Failed to capture order" });
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
        res.status(400).json({ success: false, message: "Missing token" })
        return;
        ;
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