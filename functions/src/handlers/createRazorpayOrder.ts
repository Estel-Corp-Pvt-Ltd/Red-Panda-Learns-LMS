import * as functions from "firebase-functions";
import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/https";
import { PaymentRequestSchema } from "../utils/validators";
import { defineSecret } from "firebase-functions/params";
import { getCouponDiscount, getItemsDetails } from "../utils/orderUtils";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { orderService } from "../services/orderService";
import { ORDER_STATUS, PAYMENT_PROVIDER } from "../constants";
import { currencyService } from "../services/currencyService";
import { couponService } from "../services/couponService";

if (!admin.apps.length) admin.initializeApp();

const RAZORPAY_KEY_ID = defineSecret("RAZORPAY_KEY_ID");
const RAZORPAY_SECRET_KEY = defineSecret("RAZORPAY_KEY_SECRET");

// ------------------ Create Order ------------------
async function createRazorpayOrderHandler(req: Request, res: Response) {
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
      const { couponId, discountItems, totalDiscount } = discountResult.data!;

      const coupanUsageResult = await couponService.getCouponUsageByUserAndCoupon(user.uid, couponId);
      if (!coupanUsageResult.success) {
        discount = totalDiscount;

        await couponService.createCouponUsages(
          discountItems.map((item) => ({
            userId: user.uid,
            couponId: couponId,
            refId: item.itemId,
            refType: item.itemType,
            usedAt: FieldValue.serverTimestamp(),
          }))
        );

        // Update coupon usage total
        await couponService.updateCouponUsageTotal(couponId, discountItems.length);

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

    functions.logger.info(`Converted amount to INR: ${currencyResult.data.toAmount} at rate: ${currencyResult.data.rate}`);

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
      provider: PAYMENT_PROVIDER.RAZORPAY,
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

    const { default: Razorpay } = await import("razorpay");
    const rp = new Razorpay({
      key_id: RAZORPAY_KEY_ID.value(),
      key_secret: RAZORPAY_SECRET_KEY.value()
    });

    const razorpayOrder = await rp.orders.create({
      amount: amountInPaise,
      currency: selectedCurrency,
      receipt: orderResult.data,
    });

    functions.logger.info("✅ Razorpay order created:", razorpayOrder);

    const updateResult = await orderService.updateOrderProviderOrderId(orderResult.data, razorpayOrder.id);
    if (!updateResult.success) {
      throw new Error("Failed to update order with provider order ID");
    }

    const response = {
      success: true,
      orderId: orderResult.data,
      razorpayOrder: razorpayOrder,
      key_id: RAZORPAY_KEY_ID.value()
    };

    // ✅ Store final processed response
    await idempotencyRef.update({
      status: "completed",
      response
    });

    res.json(response);
  } catch (err: any) {
    console.error("❌ Razorpay order creation failed:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}




export const createRazorpayOrder = onRequest({
  region: "us-central1",
  secrets: [RAZORPAY_KEY_ID, RAZORPAY_SECRET_KEY]
}, withMiddleware(
  corsMiddleware,
  authMiddleware,
  createRazorpayOrderHandler
));
