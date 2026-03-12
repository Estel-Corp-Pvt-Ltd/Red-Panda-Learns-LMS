/**
 * firebase-auth.ts
 *
 * Verifies Firebase ID tokens (RS256 JWTs) using the Web Crypto API.
 * Also provides admin Firebase Auth operations via REST API.
 */

import { getAccessToken } from "./service-account";

export interface DecodedToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  role?: string;
  [key: string]: unknown;
}

// ─── JWK cache ──────────────────────────────────────────────────────────────

interface JWKCache {
  keys: { [kid: string]: CryptoKey };
  fetchedAt: number;
}

let _jwkCache: JWKCache | null = null;
const JWK_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

async function getJWKs(): Promise<{ [kid: string]: CryptoKey }> {
  // Cache for 1 hour
  if (_jwkCache && Date.now() - _jwkCache.fetchedAt < 3600 * 1000) {
    return _jwkCache.keys;
  }

  const resp = await fetch(JWK_URL);
  if (!resp.ok) throw new Error(`Failed to fetch JWKs: ${resp.status}`);

  const { keys }: { keys: any[] } = await resp.json() as any;
  const result: { [kid: string]: CryptoKey } = {};

  for (const jwk of keys) {
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    result[jwk.kid] = key;
  }

  _jwkCache = { keys: result, fetchedAt: Date.now() };
  return result;
}

function base64UrlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Verify a Firebase ID token and return decoded claims.
 * Throws if the token is invalid or expired.
 */
export async function verifyIdToken(
  idToken: string,
  projectId: string
): Promise<DecodedToken> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const [headerB64, payloadB64, sigB64] = parts;

  // Decode header to get kid
  const header = JSON.parse(
    new TextDecoder().decode(base64UrlDecode(headerB64))
  );
  if (header.alg !== "RS256") throw new Error("Unsupported algorithm");

  const jwks = await getJWKs();
  const key = jwks[header.kid];
  if (!key) throw new Error("Unknown key ID");

  // Verify signature
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(sigB64);

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signature,
    signingInput
  );
  if (!valid) throw new Error("Invalid token signature");

  // Decode payload
  const payload = JSON.parse(
    new TextDecoder().decode(base64UrlDecode(payloadB64))
  );

  // Validate claims
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error("Token expired");
  if (payload.iat > now + 300) throw new Error("Token issued in the future");
  if (payload.aud !== projectId) throw new Error("Token audience mismatch");
  if (
    payload.iss !== `https://securetoken.google.com/${projectId}`
  ) {
    throw new Error("Token issuer mismatch");
  }

  return {
    uid: payload.sub || payload.uid,
    ...payload,
  };
}

// ─── Firebase Auth Admin operations (via REST API) ──────────────────────────

const IDENTITY_TOOLKIT = "https://identitytoolkit.googleapis.com/v1";

/** Get a Firebase Auth user by email (admin scope). Returns null if not found. */
export async function getAuthUserByEmail(
  email: string,
  projectId: string,
  serviceAccountJson: string
): Promise<{ uid: string; email: string; displayName?: string } | null> {
  const token = await getAccessToken(serviceAccountJson);
  const resp = await fetch(
    `${IDENTITY_TOOLKIT}/projects/${projectId}/accounts:lookup`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: [email] }),
    }
  );

  if (!resp.ok) return null;
  const data: any = await resp.json();
  if (!data.users || data.users.length === 0) return null;

  const u = data.users[0];
  return { uid: u.localId, email: u.email, displayName: u.displayName };
}

/** Create a Firebase Auth user (admin scope). */
export async function createAuthUser(
  opts: {
    email: string;
    password: string;
    displayName?: string;
    emailVerified?: boolean;
  },
  projectId: string,
  serviceAccountJson: string
): Promise<{ uid: string }> {
  const token = await getAccessToken(serviceAccountJson);
  const resp = await fetch(
    `${IDENTITY_TOOLKIT}/projects/${projectId}/accounts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: opts.email,
        password: opts.password,
        displayName: opts.displayName,
        emailVerified: opts.emailVerified ?? false,
      }),
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`createAuthUser failed (${resp.status}): ${text}`);
  }

  const data: any = await resp.json();
  return { uid: data.localId };
}
