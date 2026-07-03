/**
 * Cloudflare Workers entry point.
 *
 * Replaces all Firebase Cloud Functions with a single Hono app.
 * Routes mirror the original Cloud Function names 1:1 so the frontend
 * only needs to update VITE_FUNCTIONS_BASE_URL.
 *
 * Active routes (matching functions/src/index.ts exports):
 *   POST /enrollStudent
 *   POST /createRazorpayOrder
 *   POST /razorpayWebhook
 *   POST /enrollFreeCourse
 *   POST /enrollStudentsInBulk
 *   POST /createCouponUsage
 *   GET  /getOrders
 *   GET  /getOrderById
 *   GET  /getOrderStats
 *   GET  /ordersHealthCheck
 *   POST /addKarma
 *   POST /completeLesson
 */

import { Hono } from "hono";
import { cors } from "hono/cors";

import { Firestore, SERVER_TIMESTAMP, increment } from "./lib/firestore";
import { verifyIdToken, getAuthUserByEmail, createAuthUser, type DecodedToken } from "./lib/firebase-auth";
import { RazorpayClient, verifyRazorpaySignature } from "./lib/razorpay";
import { sendPaymentConfirmation, sendPaymentFailedEmail } from "./lib/email";
import { generateJson } from "./lib/gemini";
import { buildPrompt, responseSchema, validateGame, type Engine, type Difficulty } from "./lib/game";
import { updateUserStreak, getUserStreak } from "./lib/streak";
import {
  COLLECTION,
  GAME_KARMA_POINTS,
  GAME_COURSE_ID,
  ORDER_STATUS,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  PAYMENT_PROVIDER,
  ENROLLMENT_STATUS,
  ENROLLED_PROGRAM_TYPE,
  USER_ROLE,
  USER_STATUS,
  KARMA_CATEGORY,
  KARMA_BREAKDOWN_TYPE,
  LEARNING_ACTION,
} from "./constants";

// ─── Env types ────────────────────────────────────────────────────────────────

interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_SERVICE_ACCOUNT_JSON: string;
  FIREBASE_WEB_API_KEY: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  BREVO_API_KEY: string;
  API_SECRET_TOKEN: string;
  ALLOWED_ORIGINS: string;
  GEMINI_API_KEY: string;
}

type Variables = { user: DecodedToken };

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── CORS middleware ──────────────────────────────────────────────────────────

app.use("*", async (c, next) => {
  const origins = c.env.ALLOWED_ORIGINS
    ? c.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : [];
  const corsMiddleware = cors({
    origin: (origin) => (origins.includes(origin) ? origin : null),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
  });
  return corsMiddleware(c, next);
});

// ─── Auth middleware helpers ───────────────────────────────────────────────────

/** Verify Firebase ID token and attach user to context. */
async function requireAuth(
  c: { req: any; env: Env; set: (key: string, val: any) => void },
  next: () => Promise<void>
): Promise<Response | void> {
  const authHeader = c.req.header("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized: Missing token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = await verifyIdToken(token, c.env.FIREBASE_PROJECT_ID);
    c.set("user", decoded);
    await next();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/** Verify API key (Bearer token against API_SECRET_TOKEN). */
async function requireApiKey(
  c: { req: any; env: Env },
  next: () => Promise<void>
): Promise<Response | void> {
  const authHeader = c.req.header("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ success: false, error: { message: "Missing token", code: "AUTH_MISSING_TOKEN" } }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  if (authHeader.slice(7) !== c.env.API_SECRET_TOKEN) {
    return new Response(
      JSON.stringify({ success: false, error: { message: "Invalid token", code: "AUTH_INVALID_TOKEN" } }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  await next();
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function db(env: Env) {
  return new Firestore(env.FIREBASE_PROJECT_ID, env.FIREBASE_SERVICE_ACCOUNT_JSON);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Generate order ID: ORD-YYYYMMDD-NNN using a Firestore counter transaction. */
async function generateOrderId(firestore: Firestore): Promise<string> {
  const today = new Date();
  const dateStr = today
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const counterId = `orderCounters_${dateStr}`;

  let seq = 1;
  await firestore.runTransaction(async (tx) => {
    const snap = await tx.getDoc(COLLECTION.COUNTERS, counterId);
    seq = snap.exists ? ((snap.data.seq as number) ?? 0) + 1 : 1;
    tx.setDoc(COLLECTION.COUNTERS, counterId, {
      seq,
      updatedAt: SERVER_TIMESTAMP,
    });
  });

  return `ORD-${dateStr}-${String(seq).padStart(3, "0")}`;
}

/** Get course details from Firestore */
async function getCourseById(
  firestore: Firestore,
  courseId: string
): Promise<{ id: string; title: string; salePrice: number; slug: string; originalAmount?: number } | null> {
  const data = await firestore.getDoc(COLLECTION.COURSES, courseId);
  if (!data) return null;
  return {
    id: courseId,
    title: data.title as string,
    salePrice: (data.salePrice ?? data.price ?? 0) as number,
    slug: data.slug as string,
    originalAmount: (data.originalAmount ?? data.salePrice ?? 0) as number,
  };
}

/** Get bundle details from Firestore */
async function getBundleById(
  firestore: Firestore,
  bundleId: string
): Promise<{ id: string; title: string; salePrice: number; slug: string; courses: Array<{ id: string; title: string }> } | null> {
  const data = await firestore.getDoc(COLLECTION.BUNDLES, bundleId);
  if (!data) return null;
  return {
    id: bundleId,
    title: data.title as string,
    salePrice: (data.salePrice ?? data.price ?? 0) as number,
    slug: data.slug as string,
    courses: ((data.courses as any[]) ?? []).map((c: any) => ({ id: c.id, title: c.title })),
  };
}

/** Resolve items to itemsDetails with amounts */
async function getItemsDetails(
  firestore: Firestore,
  items: Array<{ itemType: string; itemId: string }>
) {
  const itemsDetails: Array<{ name: string; amount: number; itemType: string; itemId: string }> = [];

  await Promise.all(
    items.map(async (item) => {
      if (item.itemType === ENROLLED_PROGRAM_TYPE.COURSE) {
        const course = await getCourseById(firestore, item.itemId);
        if (course) {
          itemsDetails.push({
            name: course.title,
            amount: course.salePrice,
            itemType: ENROLLED_PROGRAM_TYPE.COURSE,
            itemId: item.itemId,
          });
        }
      } else if (item.itemType === ENROLLED_PROGRAM_TYPE.BUNDLE) {
        const bundle = await getBundleById(firestore, item.itemId);
        if (bundle) {
          itemsDetails.push({
            name: bundle.title,
            amount: bundle.salePrice,
            itemType: ENROLLED_PROGRAM_TYPE.BUNDLE,
            itemId: item.itemId,
          });
        }
      }
    })
  );

  const originalAmount = itemsDetails.reduce((s, i) => s + i.amount, 0);
  return { itemsDetails, originalAmount };
}

/** Enroll user in purchased items (courses/bundles) */
async function enrollUser(
  firestore: Firestore,
  user: { id: string; email: string; firstName?: string; middleName?: string; lastName?: string; [k: string]: unknown },
  items: Array<{ name: string; amount: number; itemType: string; itemId: string }>,
  orderId: string
): Promise<string[]> {
  if (!items.length) return [];

  const userName = [user.firstName, user.middleName, user.lastName]
    .filter(Boolean)
    .join(" ");

  const enrollmentIds: string[] = [];
  const writes: object[] = [];

  for (const item of items) {
    if (item.itemType === ENROLLED_PROGRAM_TYPE.COURSE) {
      const enrollmentId = `${user.id}_${item.itemId}`;
      enrollmentIds.push(enrollmentId);

      writes.push(buildEnrollmentWrite(firestore, enrollmentId, {
        id: enrollmentId,
        userId: user.id,
        userName,
        userEmail: user.email,
        courseId: item.itemId,
        courseName: item.name,
        bundleId: "",
        enrollmentDate: SERVER_TIMESTAMP,
        status: ENROLLMENT_STATUS.ACTIVE,
        orderId,
        completionDate: null,
        certification: {
          issued: false,
          issuedAt: null,
          certificateId: null,
          grade: null,
          remark: null,
          preferredName: null,
        },
        createdAt: SERVER_TIMESTAMP,
        updatedAt: SERVER_TIMESTAMP,
      }));

      // Create learning progress
      const lpId = firestore.newDocId();
      writes.push(buildLPWrite(firestore, lpId, user.id, item.itemId));
    } else if (item.itemType === ENROLLED_PROGRAM_TYPE.BUNDLE) {
      const bundle = await getBundleById(firestore, item.itemId);
      if (!bundle) continue;

      for (const course of bundle.courses) {
        const enrollmentId = `${user.id}_${course.id}`;
        enrollmentIds.push(enrollmentId);

        writes.push(buildEnrollmentWrite(firestore, enrollmentId, {
          id: enrollmentId,
          userId: user.id,
          userName,
          userEmail: user.email,
          courseId: course.id,
          courseName: course.title,
          bundleId: item.itemId,
          enrollmentDate: SERVER_TIMESTAMP,
          status: ENROLLMENT_STATUS.ACTIVE,
          orderId,
          completionDate: null,
          certification: {
            issued: false,
            issuedAt: null,
            certificateId: null,
            grade: null,
            remark: null,
            preferredName: null,
          },
          createdAt: SERVER_TIMESTAMP,
          updatedAt: SERVER_TIMESTAMP,
        }));

        const lpId = firestore.newDocId();
        writes.push(buildLPWrite(firestore, lpId, user.id, course.id));
      }
    }
  }

  await firestore.commit(writes);
  return enrollmentIds;
}

function buildEnrollmentWrite(
  firestore: Firestore,
  enrollmentId: string,
  data: Record<string, unknown>
): object {
  const docPath = (firestore as any).docBasePath as string;
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v !== "object" || v === null || !("__type" in v)) {
      if (v !== null && v !== undefined) fields[k] = toSimpleFS(v);
    }
  }
  return {
    update: {
      name: `${docPath}/${COLLECTION.ENROLLMENTS}/${encodeURIComponent(enrollmentId)}`,
      fields,
    },
    updateTransforms: [
      { fieldPath: "enrollmentDate", setToServerValue: "REQUEST_TIME" },
      { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
      { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
    ],
  };
}

function buildLPWrite(
  firestore: Firestore,
  lpId: string,
  userId: string,
  courseId: string
): object {
  const docPath = (firestore as any).docBasePath as string;
  return {
    update: {
      name: `${docPath}/${COLLECTION.LEARNING_PROGRESS}/${lpId}`,
      fields: {
        id: { stringValue: lpId },
        userId: { stringValue: userId },
        courseId: { stringValue: courseId },
        currentLessonId: { nullValue: null },
        lastAccessed: { nullValue: null },
        lessonHistory: { mapValue: { fields: {} } },
      },
    },
    updateTransforms: [
      { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
    ],
  };
}

/** Convert a plain JS value to a Firestore REST typed value object */
function toSimpleFS(v: unknown): unknown {
  if (v === null) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(toSimpleFS) } };
  }
  if (typeof v === "object") {
    const fields: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val !== undefined) fields[k] = toSimpleFS(val);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

/** Serialize a Firestore document to a plain JS object suitable for API responses */
function serializeOrder(id: string, data: Record<string, unknown>) {
  const fmt = (v: unknown) => {
    if (!v) return "N/A";
    const d = v instanceof Date ? v : new Date(String(v));
    if (isNaN(d.getTime())) return "N/A";
    return d.toISOString();
  };
  return {
    orderId: (data.orderId as string) ?? id,
    userId: data.userId ?? "",
    userName: data.userName ?? "",
    userEmail: data.userEmail ?? "",
    items: (data.items as any[]) ?? [],
    status: data.status ?? "",
    amount: data.amount ?? 0,
    exchangeRate: data.exchangeRate ?? 0,
    originalAmount: data.originalAmount ?? 0,
    promoCode: data.promoCode ?? "",
    couponDiscount: data.couponDiscount ?? 0,
    provider: data.provider ?? "",
    providerOrderId: data.providerOrderId ?? "",
    currency: data.currency ?? "",
    metadata: data.metadata ?? {},
    billingAddress: data.billingAddress ?? null,
    createdAt: fmt(data.createdAt),
    updatedAt: fmt(data.updatedAt),
    completedAt: fmt(data.completedAt),
  };
}

// ─── mapActionToBreakdown (mirrors functions/src/services/karma) ──────────────

function mapActionToBreakdown(category: string, action: string): string {
  if (category === KARMA_CATEGORY.LEARNING) {
    switch (action) {
      case LEARNING_ACTION.ASSIGNMENT_SUBMISSION_MISS:
      case LEARNING_ACTION.ASSIGNMENT_GRADE_FAIL:
      case LEARNING_ACTION.ASSIGNMENT_GRADE_PASS:
      case LEARNING_ACTION.ASSIGNMENT_GRADE_90_PLUS:
        return KARMA_BREAKDOWN_TYPE.ASSIGNMENT;
      case LEARNING_ACTION.QUIZ_MISSED:
      case LEARNING_ACTION.QUIZ_GRADE_FAIL:
      case LEARNING_ACTION.QUIZ_GRADE_PASS:
      case LEARNING_ACTION.QUIZ_GRADE_90_PLUS:
        return KARMA_BREAKDOWN_TYPE.QUIZ;
      default:
        return KARMA_BREAKDOWN_TYPE.LEARNING;
    }
  }
  if (category === KARMA_CATEGORY.COMMUNITY) return KARMA_BREAKDOWN_TYPE.COMMUNITY;
  if (category === KARMA_CATEGORY.SOCIAL) return KARMA_BREAKDOWN_TYPE.SOCIAL;
  return category;
}

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

// ── Health check ──────────────────────────────────────────────────────────────

app.get("/ordersHealthCheck", (c) =>
  c.json({ success: true, data: { status: "healthy", service: "lms-api" } })
);

// ── GET /getOrders (API key auth) ─────────────────────────────────────────────

app.get("/getOrders", async (c) => {
  const authResult = await requireApiKey(c, async () => {});
  if (authResult) return authResult;

  const firestore = db(c.env);
  const { status, userId, email, provider, startDate, endDate, limit } = c.req.query() as Record<string, string>;

  const where: Array<{ field: string; op: string; value: unknown }> = [];
  if (status) where.push({ field: "status", op: "==", value: status });
  if (userId) where.push({ field: "userId", op: "==", value: userId });
  if (email) where.push({ field: "userEmail", op: "==", value: email.toLowerCase() });
  if (provider) where.push({ field: "provider", op: "==", value: provider });

  const docs = await firestore.query(
    COLLECTION.ORDERS,
    where,
    { field: "createdAt", direction: "DESCENDING" },
    limit ? parseInt(limit) : undefined
  );

  const orders = docs.map((d) => serializeOrder(d.id, d.data));
  return c.json({ success: true, data: orders, meta: { count: orders.length, timestamp: new Date().toISOString() } });
});

// ── GET /getOrderById (API key auth) ──────────────────────────────────────────

app.get("/getOrderById", async (c) => {
  const authResult = await requireApiKey(c, async () => {});
  if (authResult) return authResult;

  const orderId = c.req.query("id");
  if (!orderId) {
    return c.json({ success: false, error: { message: "Order ID required", code: "MISSING_ORDER_ID" } }, 400);
  }

  const firestore = db(c.env);
  const data = await firestore.getDoc(COLLECTION.ORDERS, orderId);
  if (!data) {
    return c.json({ success: false, error: { message: "Order not found", code: "ORDER_NOT_FOUND" } }, 404);
  }

  return c.json({ success: true, data: serializeOrder(orderId, data), meta: { timestamp: new Date().toISOString() } });
});

// ── GET /getOrderStats (API key auth) ─────────────────────────────────────────

app.get("/getOrderStats", async (c) => {
  const authResult = await requireApiKey(c, async () => {});
  if (authResult) return authResult;

  const firestore = db(c.env);
  const docs = await firestore.query(COLLECTION.ORDERS);
  const counts: Record<string, number> = {};
  for (const d of docs) {
    const s = d.data.status as string ?? "UNKNOWN";
    counts[s] = (counts[s] ?? 0) + 1;
  }

  return c.json({ success: true, data: counts, meta: { timestamp: new Date().toISOString() } });
});

// ── POST /createRazorpayOrder (Firebase auth) ─────────────────────────────────

app.post("/createRazorpayOrder", async (c) => {
  const authResult = await requireAuth(c as any, async () => {});
  if (authResult) return authResult;

  const user = c.get("user");

  // Parse body safely
  let body: {
    items: Array<{ itemType: string; itemId: string }>;
    selectedCurrency: string;
    promoCode?: string;
    billingAddress?: unknown;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const idempotencyKey = c.req.header("Idempotency-Key");
  if (!idempotencyKey) {
    return c.json({ error: "Missing Idempotency-Key header" }, 400);
  }

  // Input validation
  const { items, selectedCurrency, promoCode, billingAddress } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return c.json({ error: "items must be a non-empty array" }, 400);
  }
  if (!selectedCurrency || typeof selectedCurrency !== "string") {
    return c.json({ error: "selectedCurrency is required" }, 400);
  }

  const firestore = db(c.env);

  // Idempotency: return cached success, surface previous failures
  const cached = await firestore.getDoc(COLLECTION.IDEMPOTENCY, idempotencyKey);
  if (cached?.status === "completed" && cached.response) {
    return c.json(cached.response);
  }
  if (cached?.status === "failed") {
    return c.json({ error: "This request previously failed. Use a new Idempotency-Key to retry." }, 409);
  }

  // Mark as processing (creates the doc if it doesn't exist yet)
  await firestore.setDoc(COLLECTION.IDEMPOTENCY, idempotencyKey, {
    status: "processing",
    createdAt: SERVER_TIMESTAMP,
  });

  // Track whether the Firestore order was created so we can clean up on error
  let orderId: string | null = null;

  console.log("[createRazorpayOrder] step:start user:", user.uid, "items:", JSON.stringify(items), "currency:", selectedCurrency);
  console.log("[createRazorpayOrder] env check — RAZORPAY_KEY_ID present:", !!c.env.RAZORPAY_KEY_ID, "SECRET present:", !!c.env.RAZORPAY_KEY_SECRET, "PROJECT_ID:", c.env.FIREBASE_PROJECT_ID);

  try {
    const { itemsDetails, originalAmount } = await getItemsDetails(firestore, items);
    console.log("[createRazorpayOrder] step:itemsDetails", JSON.stringify(itemsDetails), "originalAmount:", originalAmount);

    if (itemsDetails.length === 0) {
      throw new Error("None of the requested items could be found");
    }

    // Coupon discount
    let discount = 0;
    if (promoCode) {
      const coupons = await firestore.query(COLLECTION.COUPONS, [
        { field: "code", op: "==", value: promoCode },
      ], undefined, 1);

      if (coupons.length > 0) {
        const coupon = coupons[0];
        const couponData = coupon.data;
        const existingUsage = await firestore.query(COLLECTION.COUPON_USAGES, [
          { field: "userId", op: "==", value: user.uid },
          { field: "couponId", op: "==", value: coupon.id },
        ], undefined, 1);

        if (existingUsage.length === 0) {
          const pct = (couponData.discountPercentage as number) ?? 0;
          const linkedCourseIds = (couponData.linkedCourseIds as string[]) ?? [];
          const linkedBundleIds = (couponData.linkedBundleIds as string[]) ?? [];
          let restUsages = ((couponData.usageLimit as number) ?? 0) - ((couponData.totalUsed as number) ?? 0);

          for (const item of itemsDetails) {
            if (restUsages <= 0) break;
            if (
              (item.itemType === ENROLLED_PROGRAM_TYPE.COURSE && linkedCourseIds.includes(item.itemId)) ||
              (item.itemType === ENROLLED_PROGRAM_TYPE.BUNDLE && linkedBundleIds.includes(item.itemId))
            ) {
              discount += item.amount * pct / 100;
              restUsages--;
            }
          }
        }
      }
    }

    // Currency conversion
    let convertedAmount = originalAmount - discount;
    let exchangeRate = 1;
    if (selectedCurrency !== "INR") {
      const rateDoc = await firestore.getDoc("FallbackCurrencyRates", `INR_${selectedCurrency}`);
      if (rateDoc && typeof rateDoc.rate === "number") {
        exchangeRate = rateDoc.rate as number;
        convertedAmount = (originalAmount - discount) * exchangeRate;
      }
    }

    const amountInPaise = Math.round(convertedAmount * 100);
    console.log("[createRazorpayOrder] step:pricing discount:", discount, "convertedAmount:", convertedAmount, "amountInPaise:", amountInPaise);

    if (amountInPaise <= 0) {
      throw new Error("Order amount must be greater than zero");
    }

    // Create internal order
    orderId = await generateOrderId(firestore);
    console.log("[createRazorpayOrder] step:orderId generated:", orderId);

    await firestore.setDoc(COLLECTION.ORDERS, orderId, {
      orderId,
      userId: user.uid,
      userEmail: user.email ?? "",
      userName: (user.name as string) ?? "",
      items: itemsDetails,
      status: ORDER_STATUS.PENDING,
      originalAmount,
      exchangeRate,
      provider: PAYMENT_PROVIDER.RAZORPAY,
      providerOrderId: "",
      couponDiscount: discount,
      amount: convertedAmount,
      currency: selectedCurrency,
      promoCode: promoCode ?? "",
      metadata: {},
      billingAddress: billingAddress ?? null,
      completedAt: null,
      createdAt: SERVER_TIMESTAMP,
      updatedAt: SERVER_TIMESTAMP,
    });
    console.log("[createRazorpayOrder] step:order saved to Firestore");

    // Create Razorpay order — this is the external call most likely to fail
    console.log("[createRazorpayOrder] step:calling Razorpay API amount:", amountInPaise, "currency:", selectedCurrency);
    const rp = new RazorpayClient(c.env.RAZORPAY_KEY_ID, c.env.RAZORPAY_KEY_SECRET);
    const razorpayOrder = await rp.createOrder({
      amount: amountInPaise,
      currency: selectedCurrency,
      receipt: orderId,
    });
    console.log("[createRazorpayOrder] step:razorpay order created:", razorpayOrder.id);

    // Update internal order with the Razorpay order ID
    await firestore.updateDoc(COLLECTION.ORDERS, orderId, {
      providerOrderId: razorpayOrder.id,
      updatedAt: SERVER_TIMESTAMP,
    });

    const response = {
      success: true,
      orderId,
      razorpayOrder,
      key_id: c.env.RAZORPAY_KEY_ID,
    };

    // Mark idempotency as completed and cache the response
    await firestore.updateDoc(COLLECTION.IDEMPOTENCY, idempotencyKey, {
      status: "completed",
      response,
    });

    console.log("[createRazorpayOrder] step:done — success");
    return c.json(response);

  } catch (err: any) {
    console.error("[createRazorpayOrder] FAILED at step above — error:", err?.message ?? err, err?.stack ?? "");

    // Mark the internal order as FAILED so it doesn't stay PENDING indefinitely
    if (orderId) {
      await firestore.updateDoc(COLLECTION.ORDERS, orderId, {
        status: ORDER_STATUS.FAILED,
        updatedAt: SERVER_TIMESTAMP,
      }).catch((e) => console.error("[createRazorpayOrder] could not mark order failed:", e));
    }

    // Mark idempotency as failed so the client knows to use a new key
    await firestore.updateDoc(COLLECTION.IDEMPOTENCY, idempotencyKey, {
      status: "failed",
    }).catch(() => {});

    return c.json({ error: err?.message ?? "Failed to create order. Please try again." }, 500);
  }
});

// ── POST /razorpayWebhook ─────────────────────────────────────────────────────

app.post("/razorpayWebhook", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-razorpay-signature") ?? "";

  const isValid = await verifyRazorpaySignature(rawBody, signature, c.env.RAZORPAY_WEBHOOK_SECRET);
  if (!isValid) {
    return c.json({ error: "Invalid webhook signature" }, 401);
  }

  const payload = JSON.parse(rawBody) as {
    event: string;
    payload: {
      payment?: { entity: any };
      order?: { entity: any };
    };
  };

  const firestore = db(c.env);
  console.log("Razorpay webhook event:", payload.event);

  try {
    switch (payload.event) {
      case "payment.captured":
        await handlePaymentCaptured(firestore, payload.payload.payment!.entity);
        break;
      case "payment.failed":
        await handlePaymentFailed(firestore, payload.payload.payment!.entity, c.env);
        break;
      case "order.paid":
        await handleOrderPaid(firestore, payload.payload.order!.entity, c.env);
        break;
      case "order.expired":
        await handleOrderExpired(firestore, payload.payload.order!.entity);
        break;
      default:
        console.log("Unhandled event:", payload.event);
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }

  return c.json({ success: true });
});

// ── POST /verifyRazorpayPayment (Firebase auth) ───────────────────────────────
//
// Synchronous payment confirmation called from Razorpay checkout's `handler`
// callback. Verifies the payment signature and fulfills the order immediately,
// so the client isn't dependent on the (async, server-to-server) webhook.
// The order.paid webhook remains as a reliability backup — both paths are
// guarded by the already-completed check so fulfillment runs at most once.

app.post("/verifyRazorpayPayment", async (c) => {
  const authResult = await requireAuth(c as any, async () => {});
  if (authResult) return authResult;

  const user = c.get("user");

  let body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return c.json({ error: "Missing payment verification fields" }, 400);
  }

  // Razorpay payment signature = HMAC-SHA256("order_id|payment_id", KEY_SECRET)
  const valid = await verifyRazorpaySignature(
    `${razorpay_order_id}|${razorpay_payment_id}`,
    razorpay_signature,
    c.env.RAZORPAY_KEY_SECRET
  );
  if (!valid) {
    return c.json({ error: "Invalid payment signature" }, 400);
  }

  const firestore = db(c.env);
  const order = await getOrderByProviderId(firestore, razorpay_order_id);
  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }

  // Ensure the order belongs to the authenticated user
  if (order.data.userId !== user.uid) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  // Idempotent: if the webhook already fulfilled it, just report success
  if (order.data.status === ORDER_STATUS.COMPLETED) {
    return c.json({ success: true, status: "COMPLETED", alreadyCompleted: true });
  }

  try {
    await fulfillOrder(firestore, order, c.env);
    return c.json({ success: true, status: "COMPLETED" });
  } catch (err: any) {
    console.error("[verifyRazorpayPayment] fulfillment error:", err?.message ?? err);
    return c.json({ error: "Failed to finalize order" }, 500);
  }
});

async function getOrderByProviderId(
  firestore: Firestore,
  providerOrderId: string
): Promise<{ id: string; data: Record<string, unknown> } | null> {
  const docs = await firestore.query(
    COLLECTION.ORDERS,
    [{ field: "providerOrderId", op: "==", value: providerOrderId }],
    undefined,
    1
  );
  return docs[0] ?? null;
}

async function handlePaymentCaptured(firestore: Firestore, entity: any) {
  const order = await getOrderByProviderId(firestore, entity.order_id);
  if (!order) return;

  const txId = `tnx_${crypto.randomUUID()}`;
  await firestore.setDoc(COLLECTION.TRANSACTIONS, txId, {
    id: txId,
    orderId: order.data.orderId ?? order.id,
    userId: order.data.userId,
    type: TRANSACTION_TYPE.PAYMENT,
    amount: entity.amount / 100,
    currency: entity.currency,
    paymentProvider: PAYMENT_PROVIDER.RAZORPAY,
    status: TRANSACTION_STATUS.COMPLETED,
    paymentDetails: {
      method: entity.method ?? null,
      bank: entity.bank ?? null,
      wallet: entity.wallet ?? null,
      vpa: entity.vpa ?? null,
    },
    notes: entity.notes ?? [],
    createdAt: SERVER_TIMESTAMP,
    updatedAt: SERVER_TIMESTAMP,
  });
}

async function handlePaymentFailed(firestore: Firestore, entity: any, env: Env) {
  const order = await getOrderByProviderId(firestore, entity.order_id);
  if (!order) return;

  const txId = `tnx_${crypto.randomUUID()}`;
  await firestore.setDoc(COLLECTION.TRANSACTIONS, txId, {
    id: txId,
    orderId: order.data.orderId ?? order.id,
    userId: order.data.userId,
    type: TRANSACTION_TYPE.PAYMENT,
    amount: entity.amount / 100,
    currency: entity.currency,
    paymentProvider: PAYMENT_PROVIDER.RAZORPAY,
    status: TRANSACTION_STATUS.FAILED,
    paymentDetails: {
      method: entity.method ?? null,
      bank: entity.bank ?? null,
    },
    notes: entity.notes ?? [],
    createdAt: SERVER_TIMESTAMP,
    updatedAt: SERVER_TIMESTAMP,
  });

  // Notify user of the failed payment
  try {
    const userData = await firestore.getDoc(COLLECTION.USERS, order.data.userId as string);
    if (userData?.email) {
      await sendPaymentFailedEmail(
        {
          email: userData.email as string,
          name: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim(),
        },
        env.BREVO_API_KEY
      );
    }
  } catch (err) {
    console.error("[handlePaymentFailed] could not send failure email:", err);
  }
}

async function handleOrderPaid(firestore: Firestore, entity: any, env: Env) {
  const order = await getOrderByProviderId(firestore, entity.id);
  if (!order) return;
  if (order.data.status === ORDER_STATUS.COMPLETED) return;
  await fulfillOrder(firestore, order, env);
}

/**
 * Fulfill a paid order: mark it COMPLETED, enroll the user, and send the
 * confirmation email. Shared by the order.paid webhook and the synchronous
 * /verifyRazorpayPayment endpoint. Caller is responsible for the
 * already-completed guard (so this stays idempotent at the call site).
 */
async function fulfillOrder(
  firestore: Firestore,
  order: { id: string; data: Record<string, unknown> },
  env: Env
): Promise<void> {
  const orderId = (order.data.orderId as string) ?? order.id;

  // Update order status
  await firestore.updateDoc(COLLECTION.ORDERS, orderId, {
    status: ORDER_STATUS.COMPLETED,
    completedAt: SERVER_TIMESTAMP,
    updatedAt: SERVER_TIMESTAMP,
  });

  // Get user and enroll
  const userId = order.data.userId as string;
  const userData = await firestore.getDoc(COLLECTION.USERS, userId);
  if (!userData) return;

  const items = (order.data.items as Array<{ itemType: string; itemId: string; name: string; amount: number }>) ?? [];
  await enrollUser(firestore, { id: userId, ...userData } as any, items, orderId);

  // Send confirmation email (replaces sendMailWorker Pub/Sub trigger)
  try {
    const enrolledItems: Array<{ itemType: "COURSE" | "BUNDLE"; itemId: string; name: string; slug: string }> = [];

    for (const item of items) {
      if (item.itemType === ENROLLED_PROGRAM_TYPE.COURSE) {
        const course = await getCourseById(firestore, item.itemId);
        if (course) enrolledItems.push({ itemType: "COURSE", itemId: item.itemId, name: course.title, slug: course.slug });
      } else if (item.itemType === ENROLLED_PROGRAM_TYPE.BUNDLE) {
        const bundle = await getBundleById(firestore, item.itemId);
        if (bundle) enrolledItems.push({ itemType: "BUNDLE", itemId: item.itemId, name: bundle.title, slug: bundle.slug });
      }
    }

    await sendPaymentConfirmation(
      {
        name: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim(),
        email: userData.email as string,
        amount: order.data.amount as number,
        currency: order.data.currency as string,
        items: enrolledItems,
        orderId,
        purchaseDate: new Date().toISOString(),
      },
      env.BREVO_API_KEY
    );
  } catch (err) {
    console.error("Failed to send payment confirmation email:", err);
  }
}

async function handleOrderExpired(firestore: Firestore, entity: any) {
  const order = await getOrderByProviderId(firestore, entity.id);
  if (!order) return;

  const orderId = (order.data.orderId as string) ?? order.id;
  await firestore.updateDoc(COLLECTION.ORDERS, orderId, {
    status: ORDER_STATUS.FAILED,
    updatedAt: SERVER_TIMESTAMP,
  });
}

// ── POST /enrollStudent (Firebase auth + ADMIN role) ──────────────────────────

app.post("/enrollStudent", async (c) => {
  const authResult = await requireAuth(c as any, async () => {});
  if (authResult) return authResult;

  const user = c.get("user");
  if (user.role !== "ADMIN") {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    let body: { userEmail: string; items: Array<{ itemType: string; itemId: string }> };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const { userEmail, items } = body;
    if (!userEmail || !items?.length) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const firestore = db(c.env);

    const users = await firestore.query(
      COLLECTION.USERS,
      [{ field: "email", op: "==", value: userEmail }],
      undefined,
      1
    );

    if (!users.length) {
      return c.json({ error: "User not found" }, 404);
    }

    const userData = users[0].data;
    const userId = users[0].id;

    const { itemsDetails } = await getItemsDetails(firestore, items);
    if (!itemsDetails.length) {
      return c.json({ error: "No valid courses or bundles found for the given items" }, 404);
    }

    await enrollUser(firestore, { id: userId, ...userData } as any, itemsDetails, "Admin Enrollment");

    return c.json({ success: true, items: itemsDetails });
  } catch (err: any) {
    console.error("[enrollStudent]", err);
    return c.json({ error: err?.message ?? "Internal server error" }, 500);
  }
});

// ── POST /enrollFreeCourse (Firebase auth) ─────────────────────────────────────

app.post("/enrollFreeCourse", async (c) => {
  const authResult = await requireAuth(c as any, async () => {});
  if (authResult) return authResult;

  const user = c.get("user");

  try {
    const { courseId } = await c.req.json<{ courseId: string }>();

    if (!courseId) return c.json({ error: "Course ID required" }, 400);

    const firestore = db(c.env);
    const course = await getCourseById(firestore, courseId);

    if (!course) return c.json({ error: "Course not found" }, 404);
    if (course.salePrice > 0) return c.json({ error: "Course is not free" }, 400);

    const userData = await firestore.getDoc(COLLECTION.USERS, user.uid);
    if (!userData) return c.json({ error: "User not found" }, 404);

    const itemsDetails = [{ name: course.title, amount: 0, itemType: ENROLLED_PROGRAM_TYPE.COURSE, itemId: courseId }];
    await enrollUser(firestore, { id: user.uid, ...userData } as any, itemsDetails, "Free Course Enrollment");

    return c.json({ success: true, items: itemsDetails });
  } catch (err: any) {
    console.error("[enrollFreeCourse]", err);
    return c.json({ error: err?.message ?? "Internal server error" }, 500);
  }
});

// ── POST /enrollStudentsInBulk (Firebase auth + ADMIN role) ───────────────────

app.post("/enrollStudentsInBulk", async (c) => {
  const authResult = await requireAuth(c as any, async () => {});
  if (authResult) return authResult;

  const user = c.get("user");
  if (user.role !== "ADMIN") {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { students } = await c.req.json<{
    students: Array<{
      fullName: string;
      email: string;
      password: string;
      courseId: string;
      courseName: string;
    }>;
  }>();

  if (!Array.isArray(students) || students.length === 0) {
    return c.json({ error: "No students provided" }, 400);
  }

  const firestore = db(c.env);

  const results = await Promise.all(
    students.map(async (student) => {
      try {
        const { fullName, email: rawEmail, password, courseId, courseName } = student;
        const email = cleanEmail(rawEmail);
        const { firstName, middleName, lastName } = splitName(fullName);

        // Get or create Firebase Auth user
        let uid: string;
        const existing = await getAuthUserByEmail(
          email,
          c.env.FIREBASE_PROJECT_ID,
          c.env.FIREBASE_SERVICE_ACCOUNT_JSON
        );

        if (existing) {
          uid = existing.uid;
        } else {
          const created = await createAuthUser(
            { email, password, displayName: `${firstName} ${lastName}`, emailVerified: true },
            c.env.FIREBASE_PROJECT_ID,
            c.env.FIREBASE_SERVICE_ACCOUNT_JSON
          );
          uid = created.uid;
        }

        // Upsert user in Firestore (merge=true preserves existing fields like karma, etc.)
        const userDocData: Record<string, unknown> = {
          id: uid,
          email,
          firstName,
          middleName,
          lastName,
          role: USER_ROLE.STUDENT,
          status: USER_STATUS.ACTIVE,
          organizationId: null,
          photoURL: null,
          updatedAt: SERVER_TIMESTAMP,
        };
        if (!existing) {
          userDocData.createdAt = SERVER_TIMESTAMP;
        }
        await firestore.setDoc(COLLECTION.USERS, uid, userDocData, true);

        // Check if already enrolled
        const enrollmentId = `${uid}_${courseId}`;
        const existing_enrollment = await firestore.getDoc(COLLECTION.ENROLLMENTS, enrollmentId);
        if (existing_enrollment) {
          return { email, success: true, note: "already enrolled" };
        }

        // Enroll
        await enrollUser(
          firestore,
          { id: uid, email, firstName, middleName, lastName },
          [{ name: courseName, amount: 0, itemType: ENROLLED_PROGRAM_TYPE.COURSE, itemId: courseId }],
          "Admin Enrollment"
        );

        return { email, success: true };
      } catch (err: any) {
        console.error("enrollStudentsInBulk error for", student.email, err.message);
        return { email: student.email, success: false, error: err.message };
      }
    })
  );

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;

  return c.json({
    message: `Enrolled ${successCount} students successfully, ${failCount} failed.`,
    results,
  });
});

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    middleName: parts.length === 3 ? parts[1] : "",
    lastName: parts.length === 1 ? "" : parts[parts.length - 1],
  };
}

function cleanEmail(email: string) {
  email = email.trim();
  const [local, domain] = email.split("@");
  const cleanedLocal = local.replace(/\.{2,}/g, ".").replace(/\.+$/, "");
  return `${cleanedLocal}@${domain}`;
}

// ── POST /createCouponUsage (Firebase auth) ───────────────────────────────────

app.post("/createCouponUsage", async (c) => {
  const authResult = await requireAuth(c as any, async () => {});
  if (authResult) return authResult;

  const user = c.get("user");
  const { promoCode, items } = await c.req.json<{
    promoCode: string;
    items: Array<{ itemId?: string; id?: string; itemType?: string }>;
  }>();

  if (!promoCode || !Array.isArray(items)) {
    return c.json({ error: "Missing required fields: promoCode, items[]" }, 400);
  }

  const firestore = db(c.env);

  const coupons = await firestore.query(
    COLLECTION.COUPONS,
    [{ field: "code", op: "==", value: promoCode }],
    undefined,
    1
  );

  if (!coupons.length) {
    return c.json({ error: "Coupon not found" }, 404);
  }

  const couponId = coupons[0].id;

  const writes: object[] = [];
  const docBasePath = (firestore as any).docBasePath as string;

  for (const item of items) {
    const docId = firestore.newDocId();
    writes.push({
      update: {
        name: `${docBasePath}/${COLLECTION.COUPON_USAGES}/${docId}`,
        fields: {
          userId: { stringValue: user.uid },
          couponId: { stringValue: couponId },
          refId: { stringValue: item.itemId ?? item.id ?? "" },
          refType: { stringValue: item.itemType ?? "product" },
        },
      },
      updateTransforms: [
        { fieldPath: "usedAt", setToServerValue: "REQUEST_TIME" },
      ],
    });
  }

  // Increment totalUsed
  writes.push({
    update: {
      name: `${docBasePath}/${COLLECTION.COUPONS}/${couponId}`,
      fields: {},
    },
    updateMask: { fieldPaths: [] },
    updateTransforms: [
      { fieldPath: "totalUsed", increment: { integerValue: String(items.length) } },
    ],
  });

  await firestore.commit(writes);
  return c.json({ success: true });
});

// ── POST /addKarma (Firebase auth) ─────────────────────────────────────────────

app.post("/addKarma", async (c) => {
  const authResult = await requireAuth(c as any, async () => {});
  if (authResult) return authResult;

  const user = c.get("user");
  const { userId, category, action, courseId, userName } = await c.req.json<{
    userId?: string;
    category: string;
    action: string;
    courseId: string;
    userName?: string;
  }>();

  if (!category || !action || !courseId) {
    return c.json({ error: "Missing required fields: category, action, courseId" }, 400);
  }

  if (!Object.values(KARMA_CATEGORY).includes(category as any)) {
    return c.json({ error: "Invalid karma category" }, 400);
  }

  const firestore = db(c.env);
  const targetUserId = userId ?? user.uid;

  // Handle social category — mark hasSharedCertificate
  if (category === KARMA_CATEGORY.SOCIAL) {
    const enrollmentId = `${targetUserId}_${courseId}`;
    await firestore.updateDoc(COLLECTION.ENROLLMENTS, enrollmentId, {
      "certification.hasSharedCertificate": true,
    });
  }

  // Get karma points from KarmaRules
  const rules = await firestore.query(
    COLLECTION.KARMA_RULES,
    [
      { field: "category", op: "==", value: category },
      { field: "action", op: "==", value: action },
      { field: "enabled", op: "==", value: true },
    ],
    undefined,
    1
  );

  if (!rules.length) {
    return c.json({ error: `No karma rule found for category=${category}, action=${action}` }, 404);
  }

  const points = rules[0].data.points as number;
  const breakdownKey = mapActionToBreakdown(category, action);

  const today = new Date().toISOString().slice(0, 10);
  const docId = `${targetUserId}_${courseId}_${today}`;

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.getDoc(COLLECTION.KARMA_DAILY, docId);

    if (!snap.exists) {
      const breakdown: Record<string, number> = {
        LEARNING: 0,
        ASSIGNMENT: 0,
        QUIZ: 0,
        COMMUNITY: 0,
        SOCIAL: 0,
      };
      breakdown[breakdownKey] = points;

      tx.setDoc(COLLECTION.KARMA_DAILY, docId, {
        id: docId,
        userId: targetUserId,
        courseId,
        userName: userName ?? "",
        dayKey: today,
        date: new Date().toISOString(),
        karmaEarned: points,
        breakdown,
      });
    } else {
      tx.updateDoc(COLLECTION.KARMA_DAILY, docId, {
        karmaEarned: increment(points),
        [`breakdown.${breakdownKey}`]: increment(points),
        updatedAt: SERVER_TIMESTAMP,
      });
    }
  });

  return c.json({ success: true });
});

// ── POST /completeLesson (Firebase auth) ──────────────────────────────────────

app.post("/completeLesson", async (c) => {
  const authResult = await requireAuth(c as any, async () => {});
  if (authResult) return authResult;

  const user = c.get("user");

  let body: { courseId: string; itemId: string; type: string; isCompleted: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { courseId, itemId, type, isCompleted } = body;
  if (!courseId || !itemId || !type || isCompleted === undefined) {
    return c.json({ error: "Missing required fields: courseId, itemId, type, isCompleted" }, 400);
  }

  const firestore = db(c.env);

  // Find the user's LearningProgress doc for this course
  const docs = await firestore.query(
    COLLECTION.LEARNING_PROGRESS,
    [
      { field: "userId", op: "==", value: user.uid },
      { field: "courseId", op: "==", value: courseId },
    ],
    undefined,
    1
  );

  let progressId: string;
  let existingHistory: Record<string, unknown> = {};

  if (docs.length === 0) {
    // Create a fresh progress doc
    progressId = firestore.newDocId();
    await firestore.setDoc(COLLECTION.LEARNING_PROGRESS, progressId, {
      id: progressId,
      userId: user.uid,
      courseId,
      currentLessonId: itemId,
      lastAccessed: SERVER_TIMESTAMP,
      lessonHistory: {},
      updatedAt: SERVER_TIMESTAMP,
    });
  } else {
    progressId = docs[0].id;
    existingHistory = (docs[0].data.lessonHistory as Record<string, unknown>) ?? {};
  }

  // Preserve existing timeSpent; update completion fields (idempotent)
  const existingEntry = (existingHistory[itemId] as Record<string, unknown>) ?? {};
  const updatedHistory: Record<string, unknown> = {
    ...existingHistory,
    [itemId]: {
      timeSpent: (existingEntry.timeSpent as number) ?? 0,
      markedAsComplete: isCompleted,
      type,
      completedAt: isCompleted ? new Date().toISOString() : null,
    },
  };

  await firestore.updateDoc(COLLECTION.LEARNING_PROGRESS, progressId, {
    currentLessonId: itemId,
    lessonHistory: updatedHistory,
    lastAccessed: SERVER_TIMESTAMP,
    updatedAt: SERVER_TIMESTAMP,
  });

  // Streak advances on any completion; failure here must not fail the completion.
  if (isCompleted) {
    try {
      await updateUserStreak(firestore, user.uid, Date.now());
    } catch (e) {
      console.error("streak update failed", e);
    }
  }

  return c.json({ success: true });
});

// ── POST /generateGames (API key) — batch-generate a pool via Gemini ──────────

app.post("/generateGames", async (c) => {
  const authResult = await requireApiKey(c, async () => {});
  if (authResult) return authResult;

  let body: { engine?: string; difficulty?: string; count?: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const engine = body.engine as Engine;
  if (!["grid", "graph", "timeline"].includes(engine)) {
    return c.json({ error: "engine must be one of grid|graph|timeline" }, 400);
  }
  const difficulty = (["easy", "medium", "hard"].includes(body.difficulty as string) ? body.difficulty : "easy") as Difficulty;
  const count = Math.min(Math.max(body.count ?? 5, 1), 10);

  let raw: unknown;
  try {
    raw = await generateJson(c.env.GEMINI_API_KEY, buildPrompt(engine, difficulty, count), {
      responseSchema: responseSchema(engine, count),
    });
  } catch (err: any) {
    return c.json({ error: `Gemini generation failed: ${err.message}` }, 502);
  }

  const items = Array.isArray(raw) ? raw : [raw];
  const firestore = db(c.env);
  const rejected: string[] = [];
  let generated = 0;

  for (const item of items) {
    const v = validateGame(item, engine);
    if (!v.ok) {
      rejected.push(v.reason);
      continue;
    }
    const id = firestore.newDocId();
    await firestore.setDoc(COLLECTION.GAMES, id, {
      id,
      engine,
      difficulty,
      active: true,
      createdAt: SERVER_TIMESTAMP,
      // Stored as a JSON string: Firestore can't represent nested arrays (grid walls/coins),
      // and we never query inside it. Parsed back in /getGame.
      game: JSON.stringify(v.game),
    });
    generated++;
  }

  return c.json({ requested: count, generated, rejected });
});

// ── GET /getGame (Firebase auth) — serve one game from the pool, rotating daily ──

app.get("/getGame", async (c) => {
  const authResult = await requireAuth(c as any, async () => {});
  if (authResult) return authResult;

  const firestore = db(c.env);
  const where: Array<{ field: string; op: string; value: unknown }> = [{ field: "active", op: "==", value: true }];
  const engine = c.req.query("engine");
  if (engine) where.push({ field: "engine", op: "==", value: engine });

  const docs = await firestore.query(COLLECTION.GAMES, where, undefined, 50);
  if (!docs.length) return c.json({ error: "No games in pool. Run /generateGames first." }, 404);

  // Deterministic per-day pick so the dashboard shows a stable "daily" game.
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  const picked = docs[dayNumber % docs.length];

  return c.json({ id: picked.id, ...JSON.parse(picked.data.game as string) });
});

// ── POST /completeGame (Firebase auth) — award karma once per user per day ──────

app.post("/completeGame", async (c) => {
  const authResult = await requireAuth(c as any, async () => {});
  if (authResult) return authResult;

  const user = c.get("user");
  let body: { won?: boolean; userName?: string };
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  if (!body.won) return c.json({ success: true, karmaAwarded: 0 }); // no karma unless the game was solved

  const firestore = db(c.env);
  const today = new Date().toISOString().slice(0, 10);
  const playId = `${user.uid}_${today}`;

  // Anti-farm: one award per user per day.
  const existing = await firestore.getDoc(COLLECTION.GAME_PLAYS, playId);
  if (existing) return c.json({ success: true, karmaAwarded: 0, alreadyClaimed: true });

  await firestore.setDoc(COLLECTION.GAME_PLAYS, playId, {
    id: playId,
    userId: user.uid,
    dayKey: today,
    completedAt: SERVER_TIMESTAMP,
  });

  // Award karma into KarmaDaily (LEARNING breakdown, sentinel courseId).
  // ponytail: fixed GAME_KARMA_POINTS; move to a KarmaRules lookup if admins need to tune it.
  const docId = `${user.uid}_${GAME_COURSE_ID}_${today}`;
  await firestore.runTransaction(async (tx) => {
    const snap = await tx.getDoc(COLLECTION.KARMA_DAILY, docId);
    if (!snap.exists) {
      tx.setDoc(COLLECTION.KARMA_DAILY, docId, {
        id: docId,
        userId: user.uid,
        courseId: GAME_COURSE_ID,
        userName: body.userName ?? "",
        dayKey: today,
        date: new Date().toISOString(),
        karmaEarned: GAME_KARMA_POINTS,
        breakdown: { LEARNING: GAME_KARMA_POINTS, ASSIGNMENT: 0, QUIZ: 0, COMMUNITY: 0, SOCIAL: 0 },
      });
    } else {
      tx.updateDoc(COLLECTION.KARMA_DAILY, docId, {
        karmaEarned: increment(GAME_KARMA_POINTS),
        "breakdown.LEARNING": increment(GAME_KARMA_POINTS),
        updatedAt: SERVER_TIMESTAMP,
      });
    }
  });

  return c.json({ success: true, karmaAwarded: GAME_KARMA_POINTS });
});

// ── GET /getStreak (Firebase auth) ────────────────────────────────────────────

app.get("/getStreak", async (c) => {
  const authResult = await requireAuth(c as any, async () => {});
  if (authResult) return authResult;

  const user = c.get("user");
  const streak = await getUserStreak(db(c.env), user.uid);
  return c.json({ success: true, data: streak });
});

// ─── 404 fallback ─────────────────────────────────────────────────────────────

app.all("*", (c) => c.json({ error: "Not found" }, 404));

export default app;
