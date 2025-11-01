import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import * as admin from "firebase-admin";
import { getPayPalAccessToken, PAYPAL_API_BASE } from "../utils/paypalAuth";
const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET = defineSecret("PAYPAL_SECRET");



if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const createPaypalOrderHandler = async (req: Request, res: Response) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { transactionId, userId,  items, amount, currency } = req.body;

    // console.log("📥 Creating PayPal order:", { transactionId, userId, amount, currency });

    // ✅ VALIDATE REQUEST
    if (!transactionId || !userId || !items || !amount || !currency) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    // ✅ VERIFY TRANSACTION EXISTS AND BELONGS TO USER
    const transactionRef = db.collection("Transactions").doc(transactionId);
    const transactionDoc = await transactionRef.get();

    if (!transactionDoc.exists) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }

    const transaction = transactionDoc.data();
    
    if (!transaction) {
      res.status(404).json({ error: "Transaction data not found" });
      return;
    }

    if (transaction.userId !== userId) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    if (Math.abs(transaction.amount - amount) > 0.01) {
      console.error("Amount mismatch:", { expected: transaction.amount, received: amount });
      res.status(400).json({ error: "Amount mismatch" });
      return;
    }

    // ✅ GET ACCESS TOKEN
    // console.log("🔑 Getting PayPal access token...");
    const accessToken = await getPayPalAccessToken();

    // ✅ PREPARE ORDER
    const formattedAmount = parseFloat(amount.toFixed(2));
    const description = `Enrollment for ${items
      .map((i: any) => (i.name || "item").replace(/[^\w\s-]/g, ""))
      .join(", ")
      .substring(0, 127)}`;

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: transactionId,
          custom_id: transactionId,
          description: description,
          amount: {
            currency_code: currency,
            value: formattedAmount.toFixed(2),
          },
        },
      ],
      application_context: {
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        brand_name: "Your Company",
      },
    };

    // console.log("📤 Creating order on PayPal");

    // ✅ CREATE ORDER ON PAYPAL
    const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await orderResponse.json();
    
    if (!orderResponse.ok) {
      console.error("❌ PayPal order creation failed:", orderData);
      const errorMessage = orderData.message || 
        orderData.details?.[0]?.description || 
        "Failed to create PayPal order";
      throw new Error(errorMessage);
    }

    // ✅ UPDATE TRANSACTION WITH PAYPAL ORDER ID (THIS IS CRITICAL!)
    await transactionRef.update({
      status: "PROCESSING",
 
      updatedAt: new Date().toISOString(),
    });

    // console.log("✅ PayPal order created:", orderData.id);
    res.status(200).json({ success: true, orderId: orderData.id });
  } catch (err: any) {
    console.error("❌ PayPal order creation failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createPaypalOrder = onRequest(
  { region: "us-central1", secrets: [PAYPAL_CLIENT_ID, PAYPAL_SECRET] },
  withMiddleware(corsMiddleware, createPaypalOrderHandler)
);