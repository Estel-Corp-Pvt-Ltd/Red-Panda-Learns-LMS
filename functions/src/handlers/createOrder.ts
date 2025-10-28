import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/https";
import { validateAmount, validateCurrency } from "../utils/validators";
import { defineSecret } from "firebase-functions/params";

if (!admin.apps.length) admin.initializeApp();

const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_SECRET_KEY = defineSecret("RAZORPAY_KEY_SECRET");

// ------------------ Create Order ------------------
// Temporary in-memory cache (use Firestore/Redis for production)
const idempotencyCache = new Map<string, any>();

async function createOrderHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
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

    console.log("📥 Incoming raw body:", req.body);

    const { rawamount, rawcurrency, receipt } = req.body;

    const rawamountNum = Number(rawamount);
    if (!rawamount || isNaN(rawamountNum)) {
      throw new Error(
        `Invalid amount: rawamount could not be converted to number (got ${rawamount})`
      );
    }

    const amountInPaise = Math.round(rawamountNum * 100);
    const amount = validateAmount(amountInPaise);
    const currency = validateCurrency(rawcurrency);

    const { default: Razorpay } = await import("razorpay");

    const instance = new Razorpay({
      key_id: RAZORPAY_KEY_ID.value(),
      key_secret: RAZORPAY_SECRET_KEY.value(),
    });

    const order = await instance.orders.create({
      amount,
      currency,
      receipt,
      payment_capture: true,
    });

    console.log("✅ Order created:", order);

    const response = {
      success: true,
      order,
      key_id: RAZORPAY_KEY_ID.value(),
    };

    // Cache response for this idempotency key
    idempotencyCache.set(idempotencyKey, response);

    res.json(response);
  } catch (err: any) {
    console.error("❌ Payment creation failed:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}



export const createOrder = onRequest({
  region: "us-central1",
  secrets: [RAZORPAY_KEY_ID, RAZORPAY_SECRET_KEY]
}, withMiddleware(
  corsMiddleware,
  authMiddleware,
  createOrderHandler
));
