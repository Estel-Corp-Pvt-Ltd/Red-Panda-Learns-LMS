import { defineSecret } from "firebase-functions/params";

const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET = defineSecret("PAYPAL_SECRET");
const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";

// ✅ Shared cache across all imports
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getPayPalAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 300000) {
    console.log("✅ Using cached PayPal token");
    return cachedToken;
  }
  
  console.log("🔄 Fetching new PayPal token...");
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID.value()}:${PAYPAL_SECRET.value()}`
  ).toString("base64");
  
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ PayPal auth failed:", res.status, errorText);
    throw new Error(`PayPal auth failed: ${res.statusText}`);
  }
  
  const data = await res.json();
  
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);
  
  console.log(`✅ New token cached (expires in ${data.expires_in / 3600} hours)`);
  return data.access_token;
}

export { PAYPAL_API_BASE };