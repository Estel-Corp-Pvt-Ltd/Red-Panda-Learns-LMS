import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";

// 🔐 Secrets
const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET = defineSecret("PAYPAL_SECRET");

// ⚙️ Helper: Generate PayPal Access Token
async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID.value()}:${PAYPAL_SECRET.value()}`).toString("base64");
  const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`PayPal auth failed: ${res.statusText}`);
  const data = await res.json();
  return data.access_token;
}

/**
 * 📦 Creates a PayPal order.
 */
const createPaypalOrderHandler = async (req: Request, res: Response) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { amount, currency = "USD" } = req.body;
    if (!amount) {
      res.status(400).json({ error: "Amount is required" });
      return;
    }

    const accessToken = await getPayPalAccessToken();

    const orderResponse = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: currency, value: amount },
          },
        ],
      }),
    });

    const orderData = await orderResponse.json();
    if (!orderResponse.ok) {
      throw new Error(orderData.message || "Failed to create PayPal order");
    }

    res.status(200).json({ success: true, order: orderData });
  } catch (err: any) {
    console.error("❌ PayPal order creation failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createPaypalOrder = onRequest(
  { region: "us-central1", secrets: [PAYPAL_CLIENT_ID, PAYPAL_SECRET] },
  withMiddleware(corsMiddleware, createPaypalOrderHandler)
);
