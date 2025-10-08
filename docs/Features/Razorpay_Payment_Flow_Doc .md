💳 Razorpay Payment Flow – Technical Documentation
==================================================

Overview
--------

This document explains the complete flow of the **Razorpay payment integration** in the Vizuara AI Labs application, including:

*   How the frontend initiates a payment
*   How the backend creates and verifies orders
*   How transactions are tracked
*   How the user is enrolled upon successful payment

The integration ensures **secure**, **idempotent**, and **trackable** payments using Razorpay APIs, Firebase Cloud Functions, and internal services such as `transactionService` and `enrollmentService`.

* * *

🔁 End-to-End Flow Summary
--------------------------

    [User Clicks "Buy Now"]
            |
            v
    [Calculate Pricing based on currency]
            |
            v
    [Create transaction with metadata]
            |
            v
    [Start Razorpay Payment → Create Razorpay Order]
            |
            v
    [User Completes Payment in Razorpay Checkout]
            |
            v
    [Backend Verifies Payment Signature]
            |
            v
    [Update Transaction Status → Completed]
            |
            v
    [Enroll User in Course]
            |
            v
    [Done – Confirmation Shown to User]
    

* * *

⚙️ Detailed Flow – Razorpay Integration
---------------------------------------

### Step 1: 📦 Pricing Calculation & Transaction Initialization

When a user clicks **"Buy Now"**, the frontend performs the following:

1.  Calls a pricing service to calculate the final price based on selected currency and exchange rate.
    
2.  Creates a new **transaction record** using:
    
        const transactionId = await transactionService.createTransaction({
          userId,
          courseId: course.id,
          type: TRANSACTION_TYPE.PAYMENT,
          amount: pricing.amount,
          currency: pricing.currency,
          originalAmount: pricing.originalAmount,
          originalCurrency: pricing.originalCurrency,
          exchangeRate: pricing.exchangeRate,
          paymentProvider: provider,
          status: TRANSACTION_STATUS.PENDING,
          paymentDetails: {
            orderId: "",
            paymentId: "",
          },
          metadata: {
            userEmail,
            courseTitle: course.title,
            userAgent: navigator.userAgent,
            paymentAttempts: 1
          }
        });
        
    
3.  The returned `transactionId` is used as a **receipt** when creating a Razorpay order.
    

* * *

### Step 2: 🧾 Order Creation (Cloud Function: `/createOrder`)

#### 🔗 Endpoint:

    POST http://127.0.0.1:5001/vizuara-ai-labs/us-central1/createOrder
    

#### 📥 Request Payload:

    {
      "amount": 49900,
      "currency": "INR",
      "receipt": "generated_transaction_id"
    }
    

*   The `receipt` (i.e. transaction ID) is **truncated to 40 characters** to satisfy Razorpay’s limit.

#### ⚙️ Backend Logic:

*   A new order is created using Razorpay SDK:
    
        const order = await instance.orders.create({
          amount,
          currency,
          receipt
        });
        
    
*   Only the **public key** (`key_id`) is sent back to the client.
    

#### 📤 Response:

    {
      "success": true,
      "order": { "id": "order_xyz", "amount": 49900, ... },
      "key_id": "rzp_test_xxxxxxx"
    }
    

#### 🧠 Frontend Action:

*   The Razorpay checkout modal is opened using this data.
*   User completes payment via the Razorpay UI.

* * *

### Step 3: ✅ Signature Verification (Cloud Function: `/verifyPayment`)

#### 🔗 Endpoint:

    POST http://127.0.0.1:5001/vizuara-ai-labs/us-central1/verifyPayment
    

#### 📥 Request Payload (from Razorpay):

    {
      "razorpay_order_id": "order_xyz",
      "razorpay_payment_id": "pay_abc",
      "razorpay_signature": "generated_signature",
      "transaction_id": "original_transaction_id"
    }
    

#### ⚙️ Backend Logic:

*   Signature is verified using HMAC SHA256:
    
        const expectedSignature = crypto
          .createHmac("sha256", razorpayKeySecret.value())
          .update(order_id + "|" + payment_id)
          .digest("hex");
        
    
*   If the signature matches, payment is considered valid.
    

#### 📤 Response (on success):

    {
      "success": true,
      "transaction_id": "original_transaction_id"
    }
    

#### 📤 Response (on failure):

    {
      "success": false,
      "error": "Invalid signature"
    }
    

* * *

### Step 4: 💾 Transaction Update & Enrollment

If the backend verification is successful:

1.  The frontend updates the transaction record:
    
        await transactionService.updateTransactionStatus(transactionId, TRANSACTION_STATUS.COMPLETED, {
          orderId: order.id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        });
        
    
2.  Then calls:
    
        await enrollmentService.enrollUser(
          userId,
          course,
          response.razorpay_payment_id,
          'razorpay'
        );
        
    

* * *

### Step 5: 🧑‍🎓 User Experience & Completion

*   If all steps are successful:
    
    *   User is automatically enrolled in the course.
    *   Confirmation UI is shown.
*   If verification fails or checkout is dismissed:
    
    *   Transaction is marked `FAILED` or `CANCELLED`
    *   Error message is shown.

* * *

📦 Backend Cloud Functions Summary
----------------------------------

### 🔹 `/createOrder`

Field

Description

Method

POST

Purpose

Create Razorpay order

Secrets Used

`RAZORPAY_KEY_ID`, `KEY_SECRET`

Validations

Ensures method = POST, handles CORS

Returns

Razorpay `order` object and `key_id` (public)

* * *

### 🔹 `/verifyPayment`

Field

Description

Method

POST

Purpose

Securely verify Razorpay payment

Secrets Used

`RAZORPAY_KEY_SECRET`

Validation

Verifies HMAC signature

Returns

`{ success: true }` if valid, error if invalid

* * *

✅ Features Ensured
------------------

Feature

Status

Razorpay public key not exposed in secret form

✅

All payments are verified on backend

✅

Idempotency ensured via transaction ID

✅

Razorpay checkout failure/cancellation handled

✅

Users auto-enrolled post-payment

✅

Status tracking via `transactionService`

✅

Razorpay SDK fallback handling

✅

Cloud functions protected via Firebase Secrets

✅

Payment receipt length sanitized

✅

Logs added via `firebase-functions/logger`

✅

* * *

📌 Notes
--------

*   Razorpay limits `receipt` to **40 characters**, so always sanitize `transactionId`.
*   You should restrict `Access-Control-Allow-Origin` in production.
*   Ensure that user enrollment failures do not block payment confirmation — just log the error.
*   Avoid using frontend to validate or trust Razorpay responses directly — always call backend.

* * *

📄 Flowchart / Diagram (Suggested Structure)
--------------------------------------------

    [User Clicks "Buy Now"]
            |
            v
    [Pricing Service: Calculate Final Amount]
            |
            v
    [transactionService.createTransaction()]
            |
            v
    [processPayment()]
            |
            v
    [POST /createOrder]
            |
            v
    [Razorpay Checkout Popup]
            |
            v
    [User Completes Payment]
            |
            v
    [POST /verifyPayment]
            |
            v
    [If Signature Valid]
       |
       +--> [transactionService.updateTransactionStatus(COMPLETED)]
       |
       +--> [enrollmentService.enrollUser()]
       |
       +--> [Show Confirmation]
            |
            v
          [Done]
    

* * *