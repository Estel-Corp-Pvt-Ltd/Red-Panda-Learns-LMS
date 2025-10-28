import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { Request, Response } from "express";
import crypto from "crypto";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import { onRequest } from "firebase-functions/https";
// import { InvoiceDetails } from "../utils/invoice";
// import { PubSub } from "@google-cloud/pubsub";


if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
// const pubsub = new PubSub();

// 🔐 Define secrets from Firebase environment
const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_SECRET_KEY = defineSecret("RAZORPAY_KEY_SECRET");

/**
 * Verifies a Razorpay payment and marks the transaction as completed.
 */
const verifyPaymentHandler = async (req: Request, res: Response): Promise<void> => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    // 🧾 Extract required fields
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      transaction_id,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !transaction_id
    ) {
      res.status(400).json({ success: false, error: "Missing parameters" });
      return;
    }

    // Step 1️⃣ Validate HMAC signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_SECRET_KEY.value())
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

    // Step 2️⃣ Verify transaction record in Firestore
    const txnRef = db.collection("Transactions").doc(transaction_id);
    const txnSnap = await txnRef.get();

    if (!txnSnap.exists) {
      console.warn("❌ Transaction not found:", transaction_id);
      res.status(404).json({ success: false, error: "Transaction not found" });
      return;
    }

    const txn = txnSnap.data()!;
    console.log("✅ Transaction fetched:", txn);

    // If already completed, return idempotent success
    if (txn.status === "COMPLETED") {
      console.log("ℹ️ Transaction already completed, returning success");
      res.json({ success: true, transaction_id });
      return;
    }

    // Step 3️⃣ (Optional) Fetch user details if needed
    // const userSnap = await db.collection("Users").doc(txn.userId).get();
    // if (!userSnap.exists) throw new Error("User not found");

    // Step 4️⃣ Cross-check with Razorpay API
    const { default: Razorpay } = await import("razorpay");
    const instance = new Razorpay({
      key_id: RAZORPAY_KEY_ID.value(),
      key_secret: RAZORPAY_SECRET_KEY.value(),
    });

    let payment;
    try {
      payment = await instance.payments.fetch(razorpay_payment_id);
      console.log("✅ Razorpay payment fetched:", payment);
    } catch (err) {
      console.error("❌ Razorpay fetch failed:", err);
      res.status(400).json({ success: false, error: "Invalid payment ID" });
      return;
    }

    if (payment.status !== "captured") {
      res.status(400).json({ success: false, error: "Payment not captured" });
      return;
    }

    // Step 5️⃣ Update transaction as completed
    await txnRef.update({
      status: "COMPLETED",
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      completedAt: Date.now(),
    });

    // Step 6️⃣ (Optional) Send confirmation email or invoice
    // const mailPayload: InvoiceDetails = {
    //   amount: 10000,
    //   email: "9426gsingh@gmail.com",
    //   name: "Gyanendra Singh",
    //   billTo: {
    //     name: "Gyanendra Singh",
    //     address: {
    //       line1: "123, Main Street",
    //       city: "City",
    //       state: "State",
    //       country: "Country",
    //       postalCode: "123456",
    //     },
    //   },
    //   shipTo: {
    //     name: "Gyanendra Singh",
    //     address: {
    //       line1: "123, Main Street",
    //       city: "City",
    //       state: "State",
    //       country: "Country",
    //       postalCode: "123456",
    //     },
    //   },
    // };

    // await pubsub.topic("send-mail").publishMessage({
    //   json: mailPayload,
    // });

    console.log("✅ Transaction marked as COMPLETED:", transaction_id);
    res.json({ success: true, transaction_id });
  } catch (error: any) {
    console.error("❌ Verification crash:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error during payment verification",
    });
  }
}


export const verifyPayment = onRequest({
  region: "us-central1",
  secrets: [RAZORPAY_KEY_ID, RAZORPAY_SECRET_KEY],
  memory: "512MiB"
}, withMiddleware(corsMiddleware, authMiddleware, verifyPaymentHandler));
