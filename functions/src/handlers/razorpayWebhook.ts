import * as functions from 'firebase-functions';
import { onRequest } from "firebase-functions/v2/https";
import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { razorpayWebhookMiddleware } from "../middlewares/razorpayWebhook";
import { transactionService } from "../services/transactionService";
import { orderService } from "../services/orderService";
import { enrollmentService } from "../services/enrollService";
import { TRANSACTION_STATUS, ORDER_STATUS } from "../constants";
import { rawBodyMiddleware } from "../middlewares/rawBody";
import { defineSecret } from "firebase-functions/params";

const RAZORPAY_WEBHOOK_SECRET = defineSecret("RAZORPAY_WEBHOOK_SECRET");

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        status: string;
        amount: number;
        currency: string;
        method?: string;
        bank?: string;
        wallet?: string;
        vpa?: string;
        acquirer_data?: any;
      };
    };
    order: {
      entity: {
        id: string;
        receipt: string;
        notes?: Record<string, string>;
      };
    };
  };
}

const razorpayWebhookHandler = async (req: Request, res: Response) => {
  try {
    // Get the verified webhook payload from middleware
    const webhookPayload = req.body as RazorpayWebhookPayload;

    if (!webhookPayload) {
      res.status(400).json({ error: "No verified webhook payload" });
      return;
    }

    functions.logger.info("🔔 Razorpay Webhook Received:", {
      event: webhookPayload.event,
      orderId: webhookPayload.payload.order.entity.id,
      paymentId: webhookPayload.payload.payment.entity.id
    });

    // Process different webhook events
    switch (webhookPayload.event) {
      case "payment.captured":
        await handlePaymentCaptured(webhookPayload);
        break;

      case "payment.failed":
        await handlePaymentFailed(webhookPayload);
        break;

      case "order.paid":
        await handleOrderPaid(webhookPayload);
        break;

      default:
        functions.logger.info(`ℹ️ Unhandled webhook event: ${webhookPayload.event}`);
    }

    res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (error: any) {
    functions.logger.error("❌ Webhook processing failed:", error);
    res.status(200).json({ error: "Webhook processing failed" });
  }
};

// Handle successful payment capture
async function handlePaymentCaptured(payload: RazorpayWebhookPayload) {
  const { payment, order } = payload.payload;

  functions.logger.info("💰 Payment Captured:", {
    paymentId: payment.entity.id,
    orderId: order.entity.id,
    amount: payment.entity.amount,
    currency: payment.entity.currency,
  });

  // Update order status
  await orderService.updateOrderStatus(order.entity.id, ORDER_STATUS.COMPLETED);

  // Enroll user in courses/bundles
  await enrollUserInPurchasedItems(order.entity.id);
}

// Handle failed payment
async function handlePaymentFailed(payload: RazorpayWebhookPayload) {
  const { payment, order } = payload.payload;

  functions.logger.error("❌ Payment Failed:", {
    paymentId: payment.entity.id,
    orderId: order.entity.id,
  });

  const userOrder = await orderService.getOrderByProviderId(order.entity.id);

  if (!userOrder.success || !userOrder.data) {
    functions.logger.warn("Order not found for provider order ID:", order.entity.id);
    return;
  }

  await orderService.updateOrderStatus(userOrder.data.orderId, ORDER_STATUS.FAILED);
  await transactionService.updateTransactionStatusByOrderId(
    userOrder.data.orderId,
    TRANSACTION_STATUS.FAILED
  );
}

// Handle order paid
async function handleOrderPaid(payload: RazorpayWebhookPayload) {
  const { order } = payload.payload;

  const userOrder = await orderService.getOrderByProviderId(order.entity.id);

  if (!userOrder.success || !userOrder.data) {
    functions.logger.warn("Order not found for provider order ID:", order.entity.id);
    return;
  }

  await orderService.updateOrderStatus(userOrder.data.orderId, ORDER_STATUS.COMPLETED);
  await transactionService.updateTransactionStatusByOrderId(
    userOrder.data.orderId,
    TRANSACTION_STATUS.COMPLETED
  );
  await enrollUserInPurchasedItems(userOrder.data.orderId);
}

// Enroll user in purchased courses/bundles
async function enrollUserInPurchasedItems(orderId: string) {
  try {
    // Get order details
    const orderResult = await orderService.getOrderById(orderId);
    if (!orderResult.success || !orderResult.data) {
      functions.logger.warn("Order not found:", orderId);
      return;
    }

    const order = orderResult.data;
    const { userId, items } = order;

    // Enroll user in each purchased item
    await enrollmentService.enrollUser(userId, items, orderId);

  } catch (error) {
    functions.logger.error("❌ Failed to enroll user in purchased items:", error);
  }
}

export const razorpayWebhook = onRequest(
  {
    region: "us-central1",
    secrets: [RAZORPAY_WEBHOOK_SECRET],
    timeoutSeconds: 30
  },
  withMiddleware(
    rawBodyMiddleware,
    razorpayWebhookMiddleware(RAZORPAY_WEBHOOK_SECRET.value()),
    razorpayWebhookHandler
  )
);
