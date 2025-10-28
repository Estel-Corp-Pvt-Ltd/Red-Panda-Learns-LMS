import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";

const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET = defineSecret("PAYPAL_SECRET");

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
 * 💵 Captures a PayPal order after payment approval.
 */
const capturePaypalOrderHandler = async (req: Request, res: Response) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { orderId } = req.body;
    if (!orderId) {
      res.status(400).json({ error: "Missing orderId" });
      return;
    }

    const accessToken = await getPayPalAccessToken();

    const captureResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await captureResponse.json();
    if (!captureResponse.ok) {
      throw new Error(captureData.message || "Failed to capture PayPal order");
    }

    res.status(200).json({ success: true, capture: captureData });
  } catch (err: any) {
    console.error("❌ PayPal capture failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const capturePaypalOrder = onRequest(
  { region: "us-central1", secrets: [PAYPAL_CLIENT_ID, PAYPAL_SECRET] },
  withMiddleware(corsMiddleware, capturePaypalOrderHandler)
);
