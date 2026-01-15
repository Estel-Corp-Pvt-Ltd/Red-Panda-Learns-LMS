import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import * as admin from "firebase-admin";
const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET = defineSecret("PAYPAL_SECRET");
import { getPayPalAccessToken, PAYPAL_API_BASE } from "../utils/paypalAuth";
import { authMiddleware } from "../middlewares/auth";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();


/**
 * 💵 Captures a PayPal order after payment approval.
 */
const capturePaypalOrderHandler = async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    console.log("❌ Method not allowed:", req.method);
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  try {
    // console.log("the frontend has successfuly hit capture ")
    const { orderId, transactionId, userId } = req.body;

    // console.log("📥 Capture request:", { orderId, transactionId, userId });

    if (!orderId || !transactionId || !userId) {
      console.log("❌ Missing fields");
      res.status(400).json({ success: false, error: "Missing required fields" });
      return;
    }

    // Verify transaction
    // console.log("🔍 Looking up transaction:", transactionId);
    const transactionRef = db.collection("Transactions").doc(transactionId);
    const transactionDoc = await transactionRef.get();

    if (!transactionDoc.exists) {
      console.log("❌ Transaction not found:", transactionId);
      res.status(404).json({ success: false, error: "Transaction not found" });
      return;
    }

    const transaction = transactionDoc.data();
    // console.log("📄 Transaction data:", transaction);

    if (!transaction) {
      console.log("❌ Transaction data is null");
      res.status(404).json({ success: false, error: "Transaction data not found" });
      return;
    }

    if (transaction.userId !== userId) {
      console.log("❌ User ID mismatch:", { expected: transaction.userId, received: userId });
      res.status(403).json({ success: false, error: "Unauthorized" });
      return;
    }



    // Capture payment
    // console.log("💰 Getting PayPal access token...");
    const accessToken = await getPayPalAccessToken(PAYPAL_CLIENT_ID.value(), PAYPAL_SECRET.value());
    // console.log("✅ Access token obtained");
    // console.log("order idddddd",orderId)

    const captureResponse = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const captureData = await captureResponse.json();
    // console.log("📥 PayPal capture response:", { 
    //   status: captureResponse.status, 
    //   data: captureData 
    // });

    if (!captureResponse.ok) {
      console.error("❌ PayPal capture failed:", captureData);
      throw new Error(captureData.message || "Failed to capture PayPal order");
    }

    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    // console.log("💰 Capture details:", capture);

    if (!capture) {
      console.error("❌ No capture in response");
      throw new Error("No capture data received");
    }

    if (capture.status !== "COMPLETED") {
      console.error("❌ Capture status not completed:", capture.status);
      throw new Error(`Payment status: ${capture.status}`);
    }

    // Update transaction
    // console.log("💾 Updating transaction to COMPLETED");
    await transactionRef.update({
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
    });

    // Enroll user
    // console.log("📚 Enrolling user in items");
    const items = transaction.items || [];
    for (const item of items) {
      try {
        await db.collection("Enrollments").add({
          userId,
          itemId: item.itemId,
          itemType: item.itemType,
          transactionId,
          enrolledAt: new Date().toISOString(),
        });
        // console.log("✅ Enrolled in:", item.itemId);
      } catch (enrollError) {
        console.error("❌ Enrollment error:", item, enrollError);
      }
    }

    // console.log("✅ Payment captured successfully");

    res.status(200).json({
      success: true,
      paymentId: capture.id,
      transactionId,
    });

  } catch (err: any) {
    console.error("❌ Capture error:", err);
    console.error("Error stack:", err.stack);

    if (req.body?.transactionId) {
      try {
        await db.collection("Transactions").doc(req.body.transactionId).update({
          status: "FAILED",
          errorMessage: err.message,
          updatedAt: new Date().toISOString(),
        });
      } catch (updateError) {
        console.error("❌ Failed to update transaction:", updateError);
      }
    }

    res.status(500).json({
      success: false,
      error: err.message || "Capture failed"
    });
  }
};

export const capturePaypalOrder = onRequest(
  { region: "us-central1", secrets: [PAYPAL_CLIENT_ID, PAYPAL_SECRET] },
  withMiddleware(corsMiddleware, authMiddleware, capturePaypalOrderHandler)
);
