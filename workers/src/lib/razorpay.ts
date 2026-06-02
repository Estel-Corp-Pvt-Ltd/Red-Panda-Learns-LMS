/**
 * razorpay.ts
 *
 * Minimal Razorpay API client for Cloudflare Workers.
 * Replaces the razorpay npm SDK (which uses Node.js APIs).
 */

export class RazorpayClient {
  private auth: string;

  constructor(keyId: string, keySecret: string) {
    this.auth = "Basic " + btoa(`${keyId}:${keySecret}`);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: object
  ): Promise<T> {
    const resp = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: {
        Authorization: this.auth,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data: any = await resp.json();

    if (!resp.ok) {
      throw new Error(
        data?.error?.description || `Razorpay ${method} ${path} failed: ${resp.status}`
      );
    }

    return data as T;
  }

  async createOrder(opts: {
    amount: number;      // amount in smallest currency unit (paise)
    currency: string;
    receipt?: string;
    notes?: Record<string, string>;
  }) {
    return this.request<{
      id: string;
      entity: string;
      amount: number;
      currency: string;
      receipt: string;
      status: string;
    }>("POST", "/orders", opts);
  }
}

/**
 * Verify a Razorpay webhook signature using Web Crypto HMAC-SHA256.
 *
 * Razorpay sets X-Razorpay-Signature to a raw lowercase hex HMAC-SHA256
 * of the raw request body, keyed with the webhook secret. There is no
 * "sha256=" prefix (that is GitHub's convention, not Razorpay's).
 */
export async function verifyRazorpaySignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const keyData = new TextEncoder().encode(secret);
    const bodyData = new TextEncoder().encode(rawBody);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const mac = await crypto.subtle.sign("HMAC", cryptoKey, bodyData);
    const expected = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Timing-safe comparison — prevents timing oracle attacks
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
