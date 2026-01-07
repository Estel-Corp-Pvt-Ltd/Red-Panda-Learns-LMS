import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { PaymentRequestSchema } from "../utils/validators";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getCouponDiscount, getItemsDetails } from "../utils/orderUtils";
import { getPayPalAccessToken, PAYPAL_API_BASE } from "../utils/paypalAuth";
import { couponService } from "../services/couponService";
import { currencyService } from "../services/currencyService";
import { ORDER_STATUS, PAYMENT_PROVIDER } from "../constants";
import { orderService } from "../services/orderService";
const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
const PAYPAL_SECRET = defineSecret("PAYPAL_SECRET");


if (!admin.apps.length) admin.initializeApp();

const createPaypalOrderHandler = async (req: Request, res: Response) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const idempotencyKey = req.get("Idempotency-Key");
    if (!idempotencyKey) {
      res.status(400).json({ error: "Missing Idempotency-Key" });
      return;
    }

    const idempotencyRef = admin
      .firestore()
      .collection("Idempotency")
      .doc(idempotencyKey);

    const cached = await idempotencyRef.get();
    if (cached.exists) {
      console.log("♻️ Cache hit — returning saved response", idempotencyKey);
      res.json(cached.data()!.response);
      return;
    }

    // ✅ Create placeholder document immediately (avoids race conditions)
    await idempotencyRef.set({
      status: "processing",
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(
        new Date(Date.now() + 24 * 60 * 60 * 1000) // ⏱ 24 hour TTL
      )
    });

    // Logic Starts Here
    const result = PaymentRequestSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid request", details: result.error });
      return;
    }

    const { items, selectedCurrency, promoCode, billingAddress } = result.data;
    const { itemsDetails, originalAmount } = await getItemsDetails(items);

    let discount = 0;
    if (promoCode) {
      const discountResult = await getCouponDiscount(itemsDetails, promoCode);
      if (!discountResult.success || !discountResult.data) {
        functions.logger.info(`Invalid promo code: ${promoCode}`);
      }
      const { couponId, totalDiscount } = discountResult.data!;

      const coupanUsageResult = await couponService.getCouponUsageByUserAndCoupon(user.uid, couponId);
      if (!coupanUsageResult.success) {
        discount = totalDiscount;

        // await couponService.createCouponUsages(
        //   discountItems.map((item) => ({
        //     userId: user.uid,
        //     couponId: couponId,
        //     refId: item.itemId,
        //     refType: item.itemType,
        //     usedAt: FieldValue.serverTimestamp(),
        //   }))
        // );

        // // Update coupon usage total
        // await couponService.updateCouponUsageTotal(couponId, discountItems.length);

        functions.logger.info(`Applying promo code: ${promoCode} with discount: ${discount}`);
      } else {
        functions.logger.info(`Promo code ${promoCode} has already been used by user ${user.uid}`);
        discount = 0;
      }
    }
    const currencyResult = await currencyService.convertCurrency(originalAmount - discount, 'INR', selectedCurrency);
    if (!currencyResult.success || !currencyResult.data) {
      throw new Error(currencyResult.error?.message || "Currency conversion failed");
    }

    const amountInPaise = Math.round((currencyResult.data.toAmount) * 100);

    functions.logger.info("💰 Creating Razorpay order for amount (in paise):", amountInPaise, user);
    // Create an order in database
    const orderResult = await orderService.createOrder({
      userId: user.uid,
      userEmail: user.email || "",
      userName: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" "),
      items: itemsDetails,
      status: ORDER_STATUS.PENDING,
      originalAmount: originalAmount,
      exchangeRate: currencyResult.data.rate,
      provider: PAYMENT_PROVIDER.PAYPAL,
      providerOrderId: "", // to be updated after Razorpay order creation
      couponDiscount: discount,
      amount: currencyResult.data.toAmount,
      currency: selectedCurrency,
      promoCode: promoCode || "",
      metadata: {},
      billingAddress: billingAddress,
    });

    if (!orderResult.success || !orderResult.data) {
      throw new Error("Failed to create order");
    }

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: orderResult.data,
          description: "Course Purchase",
          amount: {
            currency_code: selectedCurrency,
            value: (amountInPaise + 0.05 * amountInPaise).toFixed(2), // Adding 5% PayPal fee
            breakdown: {
              tax_total: {
                currency_code: selectedCurrency,
                value: (0.05 * amountInPaise).toFixed(2),
              },
              item_total: {
                currency_code: selectedCurrency,
                value: amountInPaise.toFixed(2)
              }
            }
          },
          items: itemsDetails.map(item => ({
            name: item.name.substring(0, 127), // PayPal limit
            description: `${item.itemType} - ${item.name}`.substring(0, 127),
            quantity: "1",
            unit_amount: {
              currency_code: selectedCurrency,
              value: item.amount.toFixed(2)
            },
            category: "DIGITAL_GOODS"
          }))
        },
      ],
      application_context: {
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        brand_name: "Vizuara AI Labs",
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        }
      },
    };

    // console.log("🔑 Getting PayPal access token...");
    const accessToken = await getPayPalAccessToken();

    // ✅ CREATE ORDER ON PAYPAL
    const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      functions.logger.error("❌ PayPal order creation failed:", orderData);
      const errorMessage = orderData.message ||
        orderData.details?.[0]?.description ||
        "Failed to create PayPal order";
      throw new Error(errorMessage);
    }

    const updateResult = await orderService.updateOrderProviderOrderId(orderResult.data, orderData.id);
    if (!updateResult.success) {
      throw new Error("Failed to update order with provider order ID");
    }

    // console.log("✅ PayPal order created:", orderData.id);
    const response = {
      success: true,
      orderId: orderResult.data,
      paypalOrder: orderData,
      currency: selectedCurrency,
      amount: currencyResult.data.toAmount,
      // key_id: RAZORPAY_KEY_ID.value()
    };

    // ✅ Store final processed response
    await idempotencyRef.update({
      status: "completed",
      response
    });

    res.status(200).json(response);
  } catch (err: any) {
    functions.logger.error("❌ PayPal order creation failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createPaypalOrder = onRequest(
  { region: "us-central1", secrets: [PAYPAL_CLIENT_ID, PAYPAL_SECRET] },
  withMiddleware(corsMiddleware, createPaypalOrderHandler)
);
