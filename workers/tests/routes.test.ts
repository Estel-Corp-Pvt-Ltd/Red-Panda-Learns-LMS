import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoist mock instances so they are available inside vi.mock factories ───────

const mocks = vi.hoisted(() => {
  const tx = {
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
  }
  return {
    tx,
    fs: {
      getDoc: vi.fn(),
      setDoc: vi.fn(),
      updateDoc: vi.fn(),
      query: vi.fn(),
      runTransaction: vi.fn(),
      commit: vi.fn(),
      newDocId: vi.fn(),
      // accessed as (firestore as any).baseUrl inside route helpers
      baseUrl:
        'https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/documents',
    },
    verifyIdToken: vi.fn(),
    getAuthUserByEmail: vi.fn(),
    createAuthUser: vi.fn(),
    razorpayCreateOrder: vi.fn(),
    verifyRazorpaySignature: vi.fn(),
    sendPaymentConfirmation: vi.fn(),
    sendPaymentFailedEmail: vi.fn(),
  }
})

vi.mock('../src/lib/firestore', () => ({
  // Must use `function` (not arrow) so it can be called with `new`
  Firestore: vi.fn(function () { return mocks.fs }),
  SERVER_TIMESTAMP: '__SERVER_TIMESTAMP__',
  increment: (n: number) => ({ integerValue: String(n) }),
}))

vi.mock('../src/lib/firebase-auth', () => ({
  verifyIdToken: mocks.verifyIdToken,
  getAuthUserByEmail: mocks.getAuthUserByEmail,
  createAuthUser: mocks.createAuthUser,
}))

vi.mock('../src/lib/razorpay', () => ({
  RazorpayClient: vi.fn(function () { return { createOrder: mocks.razorpayCreateOrder } }),
  verifyRazorpaySignature: mocks.verifyRazorpaySignature,
}))

vi.mock('../src/lib/email', () => ({
  sendPaymentConfirmation: mocks.sendPaymentConfirmation,
  sendPaymentFailedEmail: mocks.sendPaymentFailedEmail,
}))

import app from '../src/index'

// ─── Constants ────────────────────────────────────────────────────────────────

const ENV = {
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: 'sa@test.iam.gserviceaccount.com',
    private_key: '-----BEGIN RSA PRIVATE KEY-----\nMOCK\n-----END RSA PRIVATE KEY-----\n',
  }),
  FIREBASE_WEB_API_KEY: 'test-api-key',
  RAZORPAY_KEY_ID: 'rzp_test_key',
  RAZORPAY_KEY_SECRET: 'test_secret',
  RAZORPAY_WEBHOOK_SECRET: 'wh_secret',
  BREVO_API_KEY: 'brevo_key',
  API_SECRET_TOKEN: 'api-token-123',
  ALLOWED_ORIGINS: 'http://localhost:5173',
} as any

const apiAuth = `Bearer ${ENV.API_SECRET_TOKEN}`

const adminUser = { uid: 'admin-uid', email: 'admin@test.com', role: 'ADMIN', name: 'Admin User' }
const studentUser = { uid: 'student-uid', email: 'student@test.com', role: 'STUDENT', name: 'Student User' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(
  method: string,
  path: string,
  opts: { auth?: string; body?: unknown; headers?: Record<string, string> } = {}
) {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers ?? {}) }
  if (opts.auth) h['Authorization'] = opts.auth
  return new Request(`http://localhost${path}`, {
    method,
    headers: h,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  })
}

function asAdmin() {
  mocks.verifyIdToken.mockResolvedValue(adminUser)
  return `Bearer valid-admin-token`
}

function asStudent() {
  mocks.verifyIdToken.mockResolvedValue(studentUser)
  return `Bearer valid-student-token`
}

// Realistic order data shape for serializeOrder()
const mockOrderData = {
  orderId: 'ORD-001',
  userId: 'u1',
  userName: 'Test User',
  userEmail: 'test@t.com',
  items: [],
  status: 'COMPLETED',
  amount: 500,
  originalAmount: 500,
  exchangeRate: 1,
  promoCode: '',
  couponDiscount: 0,
  provider: 'RAZORPAY',
  providerOrderId: 'rzp_1',
  currency: 'INR',
  metadata: {},
  billingAddress: null,
  createdAt: null,
  updatedAt: null,
  completedAt: null,
}

// ─── beforeEach: reset all mocks to clean defaults ────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  // Firestore defaults
  mocks.fs.getDoc.mockResolvedValue(null)
  mocks.fs.setDoc.mockResolvedValue(undefined)
  mocks.fs.updateDoc.mockResolvedValue(undefined)
  mocks.fs.query.mockResolvedValue([])
  mocks.fs.commit.mockResolvedValue(undefined)
  mocks.fs.newDocId.mockReturnValue('new-doc-id')
  mocks.fs.runTransaction.mockImplementation(async (cb: Function) => { await cb(mocks.tx) })

  // Transaction defaults
  mocks.tx.getDoc.mockResolvedValue({ exists: false, data: {} })
  mocks.tx.setDoc.mockResolvedValue(undefined)
  mocks.tx.updateDoc.mockResolvedValue(undefined)

  // Auth default: reject all tokens
  mocks.verifyIdToken.mockRejectedValue(new Error('Invalid token'))

  // External services defaults
  mocks.razorpayCreateOrder.mockResolvedValue({ id: 'rzp_order_123', amount: 50000, currency: 'INR' })
  mocks.verifyRazorpaySignature.mockResolvedValue(false)
  mocks.sendPaymentConfirmation.mockResolvedValue(undefined)
  mocks.sendPaymentFailedEmail.mockResolvedValue(undefined)
  mocks.getAuthUserByEmail.mockResolvedValue(null)
  mocks.createAuthUser.mockResolvedValue({ uid: 'new-uid-123' })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /ordersHealthCheck
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /ordersHealthCheck', () => {
  it('returns healthy status without auth', async () => {
    const res = await app.fetch(makeReq('GET', '/ordersHealthCheck'), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('healthy')
    expect(body.data.service).toBe('lms-api')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /getOrders
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /getOrders', () => {
  it('rejects missing Authorization header', async () => {
    const res = await app.fetch(makeReq('GET', '/getOrders'), ENV)
    expect(res.status).toBe(401)
  })

  it('rejects wrong API key', async () => {
    const res = await app.fetch(makeReq('GET', '/getOrders', { auth: 'Bearer wrong-key' }), ENV)
    expect(res.status).toBe(401)
  })

  it('returns empty list when no orders', async () => {
    mocks.fs.query.mockResolvedValue([])
    const res = await app.fetch(makeReq('GET', '/getOrders', { auth: apiAuth }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toEqual([])
    expect(body.meta.count).toBe(0)
  })

  it('returns serialized orders list', async () => {
    mocks.fs.query.mockResolvedValue([{ id: 'ORD-001', data: mockOrderData }])
    const res = await app.fetch(makeReq('GET', '/getOrders', { auth: apiAuth }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].orderId).toBe('ORD-001')
    expect(body.data[0].status).toBe('COMPLETED')
    expect(body.meta.count).toBe(1)
  })

  it('filters by status query param', async () => {
    mocks.fs.query.mockResolvedValue([{ id: 'ORD-002', data: { ...mockOrderData, orderId: 'ORD-002', status: 'PENDING' } }])
    const res = await app.fetch(makeReq('GET', '/getOrders?status=PENDING', { auth: apiAuth }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    // Verify query was called with status filter
    expect(mocks.fs.query).toHaveBeenCalledWith(
      'Orders',
      expect.arrayContaining([expect.objectContaining({ field: 'status', value: 'PENDING' })]),
      expect.anything(),
      undefined
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /getOrderById
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /getOrderById', () => {
  it('rejects missing auth', async () => {
    const res = await app.fetch(makeReq('GET', '/getOrderById?id=ORD-001'), ENV)
    expect(res.status).toBe(401)
  })

  it('returns 400 when id param is missing', async () => {
    const res = await app.fetch(makeReq('GET', '/getOrderById', { auth: apiAuth }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('returns 404 when order not found', async () => {
    mocks.fs.getDoc.mockResolvedValue(null)
    const res = await app.fetch(makeReq('GET', '/getOrderById?id=ORD-999', { auth: apiAuth }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(404)
    expect(body.error.code).toBe('ORDER_NOT_FOUND')
  })

  it('returns order when found', async () => {
    mocks.fs.getDoc.mockResolvedValue(mockOrderData)
    const res = await app.fetch(makeReq('GET', '/getOrderById?id=ORD-001', { auth: apiAuth }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.orderId).toBe('ORD-001')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /getOrderStats
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /getOrderStats', () => {
  it('rejects missing auth', async () => {
    const res = await app.fetch(makeReq('GET', '/getOrderStats'), ENV)
    expect(res.status).toBe(401)
  })

  it('returns zero counts for empty orders', async () => {
    mocks.fs.query.mockResolvedValue([])
    const res = await app.fetch(makeReq('GET', '/getOrderStats', { auth: apiAuth }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toEqual({})
  })

  it('aggregates order statuses correctly', async () => {
    mocks.fs.query.mockResolvedValue([
      { id: '1', data: { status: 'COMPLETED' } },
      { id: '2', data: { status: 'COMPLETED' } },
      { id: '3', data: { status: 'PENDING' } },
      { id: '4', data: { status: 'FAILED' } },
    ])
    const res = await app.fetch(makeReq('GET', '/getOrderStats', { auth: apiAuth }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.data.COMPLETED).toBe(2)
    expect(body.data.PENDING).toBe(1)
    expect(body.data.FAILED).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /createRazorpayOrder
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /createRazorpayOrder', () => {
  const validBody = {
    items: [{ itemType: 'COURSE', itemId: 'course_1' }],
    selectedCurrency: 'INR',
  }

  it('rejects missing auth', async () => {
    const res = await app.fetch(makeReq('POST', '/createRazorpayOrder', { body: validBody }), ENV)
    expect(res.status).toBe(401)
  })

  it('rejects missing Idempotency-Key header', async () => {
    const auth = asAdmin()
    const res = await app.fetch(makeReq('POST', '/createRazorpayOrder', { auth, body: validBody }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(400)
    expect(body.error).toContain('Idempotency')
  })

  it('rejects empty items array', async () => {
    const auth = asAdmin()
    const res = await app.fetch(makeReq('POST', '/createRazorpayOrder', {
      auth,
      body: { items: [], selectedCurrency: 'INR' },
      headers: { 'Idempotency-Key': 'key-1' },
    }), ENV)
    expect(res.status).toBe(400)
  })

  it('rejects missing selectedCurrency', async () => {
    const auth = asAdmin()
    const res = await app.fetch(makeReq('POST', '/createRazorpayOrder', {
      auth,
      body: { items: [{ itemType: 'COURSE', itemId: 'c1' }] },
      headers: { 'Idempotency-Key': 'key-2' },
    }), ENV)
    expect(res.status).toBe(400)
  })

  it('returns cached response on repeated idempotency key', async () => {
    const auth = asAdmin()
    const cachedResponse = { success: true, orderId: 'ORD-CACHED', razorpayOrder: { id: 'rzp_cached' } }
    mocks.fs.getDoc.mockResolvedValue({ status: 'completed', response: cachedResponse })

    const res = await app.fetch(makeReq('POST', '/createRazorpayOrder', {
      auth,
      body: validBody,
      headers: { 'Idempotency-Key': 'cached-key' },
    }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.orderId).toBe('ORD-CACHED')
    // Razorpay should NOT be called again
    expect(mocks.razorpayCreateOrder).not.toHaveBeenCalled()
  })

  it('returns 409 when idempotency key previously failed', async () => {
    const auth = asAdmin()
    mocks.fs.getDoc.mockResolvedValue({ status: 'failed' })

    const res = await app.fetch(makeReq('POST', '/createRazorpayOrder', {
      auth,
      body: validBody,
      headers: { 'Idempotency-Key': 'failed-key' },
    }), ENV)
    expect(res.status).toBe(409)
  })

  it('creates Razorpay order end-to-end', async () => {
    const auth = asAdmin()
    // No cached idempotency doc
    mocks.fs.getDoc.mockImplementation(async (col: string, id: string) => {
      if (col === 'Idempotency') return null
      if (col === 'Courses') return { title: 'Test Course', salePrice: 500, slug: 'test-course', originalAmount: 500 }
      return null
    })
    // generateOrderId transaction: counter doesn't exist → seq=1
    mocks.tx.getDoc.mockResolvedValue({ exists: false, data: {} })

    const res = await app.fetch(makeReq('POST', '/createRazorpayOrder', {
      auth,
      body: validBody,
      headers: { 'Idempotency-Key': 'unique-key-1' },
    }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.razorpayOrder.id).toBe('rzp_order_123')
    expect(body.key_id).toBe('rzp_test_key')
    expect(mocks.razorpayCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50000, currency: 'INR' })
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /razorpayWebhook
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /razorpayWebhook', () => {
  function webhookReq(event: string, payload: unknown) {
    const body = JSON.stringify({ event, payload })
    return new Request('http://localhost/razorpayWebhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'sig' },
      body,
    })
  }

  it('rejects invalid signature', async () => {
    mocks.verifyRazorpaySignature.mockResolvedValue(false)
    const res = await app.fetch(webhookReq('payment.captured', {}), ENV)
    expect(res.status).toBe(401)
  })

  it('returns 200 for valid signature (unknown event)', async () => {
    mocks.verifyRazorpaySignature.mockResolvedValue(true)
    const res = await app.fetch(webhookReq('some.unknown.event', {}), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('handles payment.captured: creates transaction record', async () => {
    mocks.verifyRazorpaySignature.mockResolvedValue(true)
    mocks.fs.query.mockResolvedValue([{ id: 'ORD-001', data: { orderId: 'ORD-001', userId: 'u1' } }])

    const res = await app.fetch(webhookReq('payment.captured', {
      payment: { entity: { order_id: 'rzp_order_1', amount: 50000, currency: 'INR', method: 'upi', notes: [] } },
    }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mocks.fs.setDoc).toHaveBeenCalledWith(
      'Transactions',
      expect.any(String),
      expect.objectContaining({ status: 'COMPLETED', type: 'PAYMENT' })
    )
  })

  it('handles payment.failed: creates failed transaction and sends email', async () => {
    mocks.verifyRazorpaySignature.mockResolvedValue(true)
    mocks.fs.query.mockResolvedValue([{ id: 'ORD-001', data: { orderId: 'ORD-001', userId: 'u1' } }])
    mocks.fs.getDoc.mockResolvedValue({ email: 'user@t.com', firstName: 'Jane', lastName: 'Doe' })

    const res = await app.fetch(webhookReq('payment.failed', {
      payment: { entity: { order_id: 'rzp_order_1', amount: 50000, currency: 'INR', method: 'card', notes: [] } },
    }), ENV)
    expect(res.status).toBe(200)
    expect(mocks.fs.setDoc).toHaveBeenCalledWith(
      'Transactions',
      expect.any(String),
      expect.objectContaining({ status: 'FAILED' })
    )
    expect(mocks.sendPaymentFailedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user@t.com' }),
      expect.any(String)
    )
  })

  it('handles order.paid: completes order and enrolls user', async () => {
    mocks.verifyRazorpaySignature.mockResolvedValue(true)
    const courseItem = { itemType: 'COURSE', itemId: 'course_1', name: 'Test Course', amount: 500 }
    mocks.fs.query.mockResolvedValue([{
      id: 'ORD-001',
      data: { orderId: 'ORD-001', userId: 'u1', status: 'PENDING', amount: 500, currency: 'INR', items: [courseItem] },
    }])
    mocks.fs.getDoc.mockImplementation(async (col: string, id: string) => {
      if (id === 'u1') return { email: 'u@t.com', firstName: 'John', lastName: 'Doe' }
      if (id === 'course_1') return { title: 'Test Course', salePrice: 500, slug: 'test-course' }
      return null
    })

    const res = await app.fetch(webhookReq('order.paid', {
      order: { entity: { id: 'rzp_order_1' } },
    }), ENV)
    expect(res.status).toBe(200)
    expect(mocks.fs.updateDoc).toHaveBeenCalledWith(
      'Orders',
      'ORD-001',
      expect.objectContaining({ status: 'COMPLETED' })
    )
    expect(mocks.fs.commit).toHaveBeenCalled() // enrollment write
    expect(mocks.sendPaymentConfirmation).toHaveBeenCalled()
  })

  it('handles order.expired: marks order FAILED', async () => {
    mocks.verifyRazorpaySignature.mockResolvedValue(true)
    mocks.fs.query.mockResolvedValue([{ id: 'ORD-001', data: { orderId: 'ORD-001' } }])

    const res = await app.fetch(webhookReq('order.expired', {
      order: { entity: { id: 'rzp_expired' } },
    }), ENV)
    expect(res.status).toBe(200)
    expect(mocks.fs.updateDoc).toHaveBeenCalledWith(
      'Orders',
      'ORD-001',
      expect.objectContaining({ status: 'FAILED' })
    )
  })

  it('skips re-processing already completed order', async () => {
    mocks.verifyRazorpaySignature.mockResolvedValue(true)
    mocks.fs.query.mockResolvedValue([{
      id: 'ORD-001',
      data: { orderId: 'ORD-001', userId: 'u1', status: 'COMPLETED', items: [] },
    }])

    const res = await app.fetch(webhookReq('order.paid', {
      order: { entity: { id: 'rzp_order_1' } },
    }), ENV)
    expect(res.status).toBe(200)
    // Should not update or re-enroll
    expect(mocks.fs.updateDoc).not.toHaveBeenCalled()
    expect(mocks.fs.commit).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /enrollStudent
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /enrollStudent', () => {
  it('rejects missing auth', async () => {
    const res = await app.fetch(makeReq('POST', '/enrollStudent', {
      body: { userEmail: 'a@b.com', items: [{ itemType: 'COURSE', itemId: 'c1' }] },
    }), ENV)
    expect(res.status).toBe(401)
  })

  it('rejects non-admin user', async () => {
    const auth = asStudent()
    const res = await app.fetch(makeReq('POST', '/enrollStudent', {
      auth,
      body: { userEmail: 'a@b.com', items: [{ itemType: 'COURSE', itemId: 'c1' }] },
    }), ENV)
    expect(res.status).toBe(401)
  })

  it('returns 400 when body is missing required fields', async () => {
    const auth = asAdmin()
    const res = await app.fetch(makeReq('POST', '/enrollStudent', { auth, body: {} }), ENV)
    expect(res.status).toBe(400)
  })

  it('returns 400 when items array is empty', async () => {
    const auth = asAdmin()
    const res = await app.fetch(makeReq('POST', '/enrollStudent', {
      auth,
      body: { userEmail: 'a@b.com', items: [] },
    }), ENV)
    expect(res.status).toBe(400)
  })

  it('returns 404 when user email not found', async () => {
    const auth = asAdmin()
    mocks.fs.query.mockResolvedValue([]) // no user found
    const res = await app.fetch(makeReq('POST', '/enrollStudent', {
      auth,
      body: { userEmail: 'nobody@t.com', items: [{ itemType: 'COURSE', itemId: 'c1' }] },
    }), ENV)
    expect(res.status).toBe(404)
  })

  it('returns 404 when no valid items found', async () => {
    const auth = asAdmin()
    mocks.fs.query.mockResolvedValue([{ id: 'u1', data: { email: 'a@b.com', firstName: 'A', lastName: 'B' } }])
    mocks.fs.getDoc.mockResolvedValue(null) // course not found
    const res = await app.fetch(makeReq('POST', '/enrollStudent', {
      auth,
      body: { userEmail: 'a@b.com', items: [{ itemType: 'COURSE', itemId: 'ghost-course' }] },
    }), ENV)
    expect(res.status).toBe(404)
  })

  it('enrolls student successfully', async () => {
    const auth = asAdmin()
    mocks.fs.query.mockResolvedValue([{
      id: 'u1',
      data: { email: 'stu@t.com', firstName: 'Student', lastName: 'One' },
    }])
    mocks.fs.getDoc.mockResolvedValue({ title: 'Test Course', salePrice: 500, slug: 'test-course' })

    const res = await app.fetch(makeReq('POST', '/enrollStudent', {
      auth,
      body: { userEmail: 'stu@t.com', items: [{ itemType: 'COURSE', itemId: 'course_1' }] },
    }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.items).toHaveLength(1)
    expect(mocks.fs.commit).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /enrollFreeCourse
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /enrollFreeCourse', () => {
  it('rejects missing auth', async () => {
    const res = await app.fetch(makeReq('POST', '/enrollFreeCourse', { body: { courseId: 'c1' } }), ENV)
    expect(res.status).toBe(401)
  })

  it('returns 400 when courseId is missing', async () => {
    const auth = asStudent()
    const res = await app.fetch(makeReq('POST', '/enrollFreeCourse', { auth, body: {} }), ENV)
    expect(res.status).toBe(400)
  })

  it('returns 404 when course does not exist', async () => {
    const auth = asStudent()
    mocks.fs.getDoc.mockResolvedValue(null)
    const res = await app.fetch(makeReq('POST', '/enrollFreeCourse', { auth, body: { courseId: 'c999' } }), ENV)
    expect(res.status).toBe(404)
  })

  it('returns 400 when course is not free (salePrice > 0)', async () => {
    const auth = asStudent()
    mocks.fs.getDoc.mockResolvedValue({ title: 'Paid Course', salePrice: 999, slug: 'paid-course' })
    const res = await app.fetch(makeReq('POST', '/enrollFreeCourse', { auth, body: { courseId: 'c1' } }), ENV)
    expect(res.status).toBe(400)
  })

  it('returns 404 when user doc not found in Firestore', async () => {
    const auth = asStudent()
    mocks.fs.getDoc.mockImplementation(async (col: string, id: string) => {
      if (id === 'free-c') return { title: 'Free Course', salePrice: 0, slug: 'free' }
      return null // user doc missing
    })
    const res = await app.fetch(makeReq('POST', '/enrollFreeCourse', { auth, body: { courseId: 'free-c' } }), ENV)
    expect(res.status).toBe(404)
  })

  it('enrolls user in free course successfully', async () => {
    const auth = asStudent()
    mocks.fs.getDoc.mockImplementation(async (col: string, id: string) => {
      if (id === studentUser.uid) return { email: studentUser.email, firstName: 'Student', lastName: 'One' }
      return { title: 'Free Course', salePrice: 0, slug: 'free-course' }
    })

    const res = await app.fetch(makeReq('POST', '/enrollFreeCourse', { auth, body: { courseId: 'free-course-id' } }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mocks.fs.commit).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /enrollStudentsInBulk
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /enrollStudentsInBulk', () => {
  const oneStudent = [{ fullName: 'John Doe', email: 'john@t.com', password: 'pass123', courseId: 'c1', courseName: 'Test Course' }]

  it('rejects missing auth', async () => {
    const res = await app.fetch(makeReq('POST', '/enrollStudentsInBulk', { body: { students: oneStudent } }), ENV)
    expect(res.status).toBe(401)
  })

  it('rejects non-admin', async () => {
    const auth = asStudent()
    const res = await app.fetch(makeReq('POST', '/enrollStudentsInBulk', { auth, body: { students: oneStudent } }), ENV)
    expect(res.status).toBe(401)
  })

  it('returns 400 for empty students array', async () => {
    const auth = asAdmin()
    const res = await app.fetch(makeReq('POST', '/enrollStudentsInBulk', { auth, body: { students: [] } }), ENV)
    expect(res.status).toBe(400)
  })

  it('creates new Auth user and enrolls', async () => {
    const auth = asAdmin()
    mocks.getAuthUserByEmail.mockResolvedValue(null) // user doesn't exist
    mocks.createAuthUser.mockResolvedValue({ uid: 'new-uid-1' })
    mocks.fs.getDoc.mockResolvedValue(null) // no existing enrollment

    const res = await app.fetch(makeReq('POST', '/enrollStudentsInBulk', { auth, body: { students: oneStudent } }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.results[0].success).toBe(true)
    expect(mocks.createAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'john@t.com' }),
      expect.any(String),
      expect.any(String)
    )
    expect(mocks.fs.commit).toHaveBeenCalled()
  })

  it('reuses existing Auth user instead of creating', async () => {
    const auth = asAdmin()
    mocks.getAuthUserByEmail.mockResolvedValue({ uid: 'existing-uid' })
    mocks.fs.getDoc.mockResolvedValue(null) // no existing enrollment

    const res = await app.fetch(makeReq('POST', '/enrollStudentsInBulk', { auth, body: { students: oneStudent } }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.results[0].success).toBe(true)
    expect(mocks.createAuthUser).not.toHaveBeenCalled()
  })

  it('marks already-enrolled student as success with note', async () => {
    const auth = asAdmin()
    mocks.getAuthUserByEmail.mockResolvedValue({ uid: 'existing-uid' })
    mocks.fs.getDoc.mockImplementation(async (col: string, id: string) => {
      if (col === 'Enrollments') return { status: 'ACTIVE' } // already enrolled
      return null
    })

    const res = await app.fetch(makeReq('POST', '/enrollStudentsInBulk', { auth, body: { students: oneStudent } }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.results[0].success).toBe(true)
    expect(body.results[0].note).toBe('already enrolled')
  })

  it('reports per-student failure without crashing whole batch', async () => {
    const auth = asAdmin()
    mocks.getAuthUserByEmail.mockRejectedValue(new Error('Firebase error'))

    const res = await app.fetch(makeReq('POST', '/enrollStudentsInBulk', { auth, body: { students: oneStudent } }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.results[0].success).toBe(false)
    expect(body.results[0].error).toBeDefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /createCouponUsage
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /createCouponUsage', () => {
  it('rejects missing auth', async () => {
    const res = await app.fetch(makeReq('POST', '/createCouponUsage', {
      body: { promoCode: 'SAVE10', items: [] },
    }), ENV)
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing promoCode', async () => {
    const auth = asStudent()
    const res = await app.fetch(makeReq('POST', '/createCouponUsage', {
      auth,
      body: { items: [{ itemId: 'c1', itemType: 'COURSE' }] },
    }), ENV)
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing items', async () => {
    const auth = asStudent()
    const res = await app.fetch(makeReq('POST', '/createCouponUsage', {
      auth,
      body: { promoCode: 'SAVE10' },
    }), ENV)
    expect(res.status).toBe(400)
  })

  it('returns 404 when coupon code not found', async () => {
    const auth = asStudent()
    mocks.fs.query.mockResolvedValue([]) // coupon not found
    const res = await app.fetch(makeReq('POST', '/createCouponUsage', {
      auth,
      body: { promoCode: 'INVALID', items: [{ itemId: 'c1', itemType: 'COURSE' }] },
    }), ENV)
    expect(res.status).toBe(404)
  })

  it('creates coupon usage and increments totalUsed', async () => {
    const auth = asStudent()
    mocks.fs.query.mockResolvedValue([{
      id: 'coupon-1',
      data: { code: 'SAVE10', discountPercentage: 10 },
    }])

    const res = await app.fetch(makeReq('POST', '/createCouponUsage', {
      auth,
      body: { promoCode: 'SAVE10', items: [{ itemId: 'c1', itemType: 'COURSE' }] },
    }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    // commit called with usage write + increment write
    expect(mocks.fs.commit).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ update: expect.objectContaining({ name: expect.stringContaining('CouponUsages') }) }),
      ])
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /addKarma
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /addKarma', () => {
  it('rejects missing auth', async () => {
    const res = await app.fetch(makeReq('POST', '/addKarma', {
      body: { category: 'LEARNING', action: 'LESSON COMPLETION', courseId: 'c1' },
    }), ENV)
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing category', async () => {
    const auth = asStudent()
    const res = await app.fetch(makeReq('POST', '/addKarma', {
      auth,
      body: { action: 'LESSON COMPLETION', courseId: 'c1' },
    }), ENV)
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing action', async () => {
    const auth = asStudent()
    const res = await app.fetch(makeReq('POST', '/addKarma', {
      auth,
      body: { category: 'LEARNING', courseId: 'c1' },
    }), ENV)
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing courseId', async () => {
    const auth = asStudent()
    const res = await app.fetch(makeReq('POST', '/addKarma', {
      auth,
      body: { category: 'LEARNING', action: 'LESSON COMPLETION' },
    }), ENV)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid karma category', async () => {
    const auth = asStudent()
    const res = await app.fetch(makeReq('POST', '/addKarma', {
      auth,
      body: { category: 'INVALID_CAT', action: 'test', courseId: 'c1' },
    }), ENV)
    expect(res.status).toBe(400)
  })

  it('returns 404 when no karma rule found', async () => {
    const auth = asStudent()
    mocks.fs.query.mockResolvedValue([]) // no rule found
    const res = await app.fetch(makeReq('POST', '/addKarma', {
      auth,
      body: { category: 'LEARNING', action: 'LESSON COMPLETION', courseId: 'c1' },
    }), ENV)
    expect(res.status).toBe(404)
  })

  it('creates new karma daily doc when none exists', async () => {
    const auth = asStudent()
    mocks.fs.query.mockResolvedValue([{
      id: 'rule-1',
      data: { category: 'LEARNING', action: 'LESSON COMPLETION', points: 10, enabled: true },
    }])
    mocks.tx.getDoc.mockResolvedValue({ exists: false, data: {} })

    const res = await app.fetch(makeReq('POST', '/addKarma', {
      auth,
      body: { category: 'LEARNING', action: 'LESSON COMPLETION', courseId: 'c1' },
    }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mocks.tx.setDoc).toHaveBeenCalledWith(
      'KarmaDaily',
      expect.any(String),
      expect.objectContaining({ karmaEarned: 10, userId: studentUser.uid })
    )
  })

  it('updates existing karma daily doc', async () => {
    const auth = asStudent()
    mocks.fs.query.mockResolvedValue([{
      id: 'rule-1',
      data: { category: 'COMMUNITY', action: 'POST_REPLY', points: 5, enabled: true },
    }])
    mocks.tx.getDoc.mockResolvedValue({ exists: true, data: { karmaEarned: 15, breakdown: {} } })

    const res = await app.fetch(makeReq('POST', '/addKarma', {
      auth,
      body: { category: 'COMMUNITY', action: 'POST_REPLY', courseId: 'c1' },
    }), ENV)
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(mocks.tx.updateDoc).toHaveBeenCalled()
  })

  it('marks certificate shared for SOCIAL category', async () => {
    const auth = asStudent()
    mocks.fs.query.mockResolvedValue([{
      id: 'rule-1',
      data: { category: 'SOCIAL', action: 'CERTIFICATE SHARED', points: 20, enabled: true },
    }])
    mocks.tx.getDoc.mockResolvedValue({ exists: false, data: {} })

    const res = await app.fetch(makeReq('POST', '/addKarma', {
      auth,
      body: { category: 'SOCIAL', action: 'CERTIFICATE SHARED', courseId: 'c1' },
    }), ENV)
    expect(res.status).toBe(200)
    // Should have updated the enrollment to mark hasSharedCertificate
    expect(mocks.fs.updateDoc).toHaveBeenCalledWith(
      'Enrollments',
      expect.stringContaining(studentUser.uid),
      expect.objectContaining({ 'certification.hasSharedCertificate': true })
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 404 fallback
// ─────────────────────────────────────────────────────────────────────────────

describe('404 fallback', () => {
  it('returns 404 for unknown GET route', async () => {
    const res = await app.fetch(makeReq('GET', '/not-a-real-route'), ENV)
    expect(res.status).toBe(404)
  })

  it('returns 404 for unknown POST route', async () => {
    const res = await app.fetch(makeReq('POST', '/not-a-real-route', { body: {} }), ENV)
    expect(res.status).toBe(404)
  })
})
