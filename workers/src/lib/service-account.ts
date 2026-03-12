/**
 * service-account.ts
 *
 * Generates a Google OAuth2 access token from a service account JSON key.
 * Uses the Web Crypto API (available in Cloudflare Workers).
 * Caches the token within the isolate lifetime.
 */

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  project_id: string;
}

interface CachedToken {
  token: string;
  expiresAt: number; // ms since epoch
}

let _cachedToken: CachedToken | null = null;
let _cachedServiceEmail: string | null = null;

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function generateJWT(key: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: key.client_email,
    scope:
      "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${headerB64}.${payloadB64}`;

  // Strip PEM headers and whitespace
  const pem = key.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const derBytes = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    derBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  const sig64 = base64UrlEncode(new Uint8Array(signatureBuffer));
  return `${unsigned}.${sig64}`;
}

/**
 * Returns a valid OAuth2 access token for the given service account.
 * Re-uses the cached token if it has more than 60 seconds left.
 */
export async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const key: ServiceAccountKey = JSON.parse(serviceAccountJson);

  // Invalidate cache if the service account email changed
  if (
    _cachedToken &&
    _cachedServiceEmail === key.client_email &&
    Date.now() < _cachedToken.expiresAt - 60_000
  ) {
    return _cachedToken.token;
  }

  const jwt = await generateJWT(key);

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to get access token (${resp.status}): ${text}`);
  }

  const data: any = await resp.json();
  if (!data.access_token) {
    throw new Error(`No access_token in response: ${JSON.stringify(data)}`);
  }

  _cachedToken = { token: data.access_token, expiresAt: Date.now() + 3600 * 1000 };
  _cachedServiceEmail = key.client_email;

  return data.access_token;
}
