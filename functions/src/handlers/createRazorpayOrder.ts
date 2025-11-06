import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/https";
import { PaymentRequestSchema } from "../utils/validators";
import { defineSecret } from "firebase-functions/params";
import { getItemsDetails, initiateOrder } from "../utils/orderUtils";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

if (!admin.apps.length) admin.initializeApp();

const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_SECRET_KEY = defineSecret("RAZORPAY_KEY_SECRET");

// ------------------ Create Order ------------------
async function createRazorpayOrderHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const idempotencyKey = req.get("Idempotency-Key");
    if (!idempotencyKey) {
      res.status(400).json({ error: "Missing Idempotency-Key" });
      return;
    }

    const result = PaymentRequestSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid request", details: result.error });
      return;
    }

    const { items, selectedCurrency, promoCode } = result.data;

    if (promoCode) {
      functions.logger.info(`Applying promo code: ${promoCode}`);
    }

    const idempotencyRef = admin
      .firestore()
      .collection("idempotency")
      .doc(idempotencyKey);

    const cached = await idempotencyRef.get();
    if (cached.exists) {
      console.log("♻️ Cache hit — returning saved response", idempotencyKey);
      res.json(cached.data()!.response);
      return;
    }

    // ✅ Create placeholder document immediately (avoids race conditions)
    await idempotencyRef.set({
      status: "processing",
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(
        new Date(Date.now() + 24 * 60 * 60 * 1000) // ⏱ 24 hour TTL
      )
    });

    const { itemsDetails, originalAmount } = await getItemsDetails(items);
    const amountInPaise = Math.round(originalAmount * 100);

    const { default: Razorpay } = await import("razorpay");
    const rp = new Razorpay({
      key_id: RAZORPAY_KEY_ID.value(),
      key_secret: RAZORPAY_SECRET_KEY.value()
    });

    const razorpayOrder = await rp.orders.create({
      amount: amountInPaise,
      currency: selectedCurrency,
      receipt: `${idempotencyKey.substring(0, 12)}`,
    });

    functions.logger.info("✅ Razorpay order created:", razorpayOrder);

    const orderId = await initiateOrder(
      user.uid,
      razorpayOrder.id,
      result.data,
      originalAmount,
      originalAmount,
      itemsDetails,
      promoCode
    );
    if (!orderId) {
      throw new Error("Failed to create order");
    }

    const response = {
      success: true,
      orderId: orderId,
      razorpayOrder: razorpayOrder,
      key_id: RAZORPAY_KEY_ID.value()
    };

    // ✅ Store final processed response
    await idempotencyRef.update({
      status: "completed",
      response
    });

    res.json(response);
  } catch (err: any) {
    console.error("❌ Razorpay order creation failed:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}




export const createRazorpayOrder = onRequest({
  region: "us-central1",
  secrets: [RAZORPAY_KEY_ID, RAZORPAY_SECRET_KEY]
}, withMiddleware(
  corsMiddleware,
  authMiddleware,
  createRazorpayOrderHandler
));
