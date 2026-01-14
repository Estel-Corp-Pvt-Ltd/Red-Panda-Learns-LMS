import * as admin from "firebase-admin";

const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  admin.app().options.projectId || "";


export const PAYPAL_API_BASE = ["vizuara-ai-labs"].includes(projectId) ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

export async function getPayPalAccessToken(paypalClientID: string, paypalSecret: string): Promise<string> {
  if (!paypalClientID || !paypalSecret) {
    throw new Error("PayPal credentials are not set");
  }
  const auth = Buffer.from(`${paypalClientID}:${paypalSecret}`).toString("base64");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.statusText}`);
  }

  const data = await res.json();

  return data.access_token;
}
