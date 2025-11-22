import * as functions from 'firebase-functions';
import { onRequest } from "firebase-functions/v2/https";
import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { razorpayWebhookMiddleware } from "../middlewares/razorpayWebhook";
import { transactionService } from "../services/transactionService";
import { orderService } from "../services/orderService";
import { enrollmentService } from "../services/enrollService";
import { TRANSACTION_STATUS, ORDER_STATUS, TRANSACTION_TYPE } from "../constants";
import { rawBodyMiddleware } from "../middlewares/rawBody";
import { defineSecret } from "firebase-functions/params";
import { userService } from '../services/userService';
import { PubSub } from "@google-cloud/pubsub";
import { PaymentDetails } from "../utils/invoice";

const RAZORPAY_WEBHOOK_SECRET = defineSecret("RAZORPAY_WEBHOOK_SECRET");
const pubsub = new PubSub();

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
        notes?: string[];
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

    functions.logger.info("🔔 Razorpay Webhook Received:", webhookPayload);

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

      case "order.expired":
        await handleOrderExpired(webhookPayload);
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
  const { payment } = payload.payload;

  functions.logger.info("💰 Payment Captured:", {
    paymentId: payment.entity.id,
    orderId: payment.entity.order_id,
    amount: payment.entity.amount,
    currency: payment.entity.currency,
  });

  const userOrder = await orderService.getOrderByProviderId(payment.entity.order_id);

  if (!userOrder.success || !userOrder.data) {
    functions.logger.warn("Order not found for provider order ID:", payment.entity.order_id);
    return;
  }

  await transactionService.createTransaction({
    orderId: userOrder.data.orderId,
    userId: userOrder.data.userId,
    type: TRANSACTION_TYPE.PAYMENT,
    amount: payment.entity.amount / 100,
    currency: payment.entity.currency,
    paymentProvider: "RAZORPAY",
    status: TRANSACTION_STATUS.COMPLETED,
    paymentDetails: {
      method: payment.entity.method,
      bank: payment.entity.bank,
      wallet: payment.entity.wallet,
      vpa: payment.entity.vpa,
      acquirerData: payment.entity.acquirer_data,
    },
    notes: payment.entity?.notes || [],
  });
}

// Handle failed payment
async function handlePaymentFailed(payload: RazorpayWebhookPayload) {
  const { payment } = payload.payload;

  functions.logger.error("❌ Payment Failed:", {
    paymentId: payment.entity.id,
    orderId: payment.entity.order_id,
  });

  const userOrder = await orderService.getOrderByProviderId(payment.entity.order_id);

  if (!userOrder.success || !userOrder.data) {
    functions.logger.warn("Order not found for provider order ID:", payment.entity.order_id);
    return;
  }

  await transactionService.createTransaction({
    orderId: userOrder.data.orderId,
    userId: userOrder.data.userId,
    type: TRANSACTION_TYPE.PAYMENT,
    amount: payment.entity.amount / 100,
    currency: payment.entity.currency,
    paymentProvider: "RAZORPAY",
    status: TRANSACTION_STATUS.FAILED,
    paymentDetails: {
      method: payment.entity.method,
      bank: payment.entity.bank,
      wallet: payment.entity.wallet,
      vpa: payment.entity.vpa,
      acquirerData: payment.entity.acquirer_data,
    },
    notes: payment.entity?.notes || [],
  });
}

// Handle order paid
async function handleOrderPaid(payload: RazorpayWebhookPayload) {
  const { order } = payload.payload;

  const userOrder = await orderService.getOrderByProviderId(order.entity.id);

  if (!userOrder.success || !userOrder.data) {
    functions.logger.warn("Order not found for provider order ID:", order.entity.id);
    return;
  }
  if (userOrder.data.status === ORDER_STATUS.COMPLETED) {
    functions.logger.info("Order already completed:", userOrder.data.orderId);
    return;
  }

  await orderService.updateOrderStatus(userOrder.data.orderId, ORDER_STATUS.COMPLETED);
  await enrollUserInPurchasedItems(userOrder.data.orderId);
}

async function handleOrderExpired(payload: RazorpayWebhookPayload) {
  const { order } = payload.payload;

  const userOrder = await orderService.getOrderByProviderId(order.entity.id);

  if (!userOrder.success || !userOrder.data) {
    functions.logger.warn("Order not found for provider order ID:", order.entity.id);
    return;
  }

  functions.logger.error("❌ Order Expired:", {
    orderId: order.entity.id,
    userOrderId: userOrder.data.orderId,
  });

  await orderService.updateOrderStatus(userOrder.data.orderId, ORDER_STATUS.FAILED);
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

    const userResult = await userService.getUserById(userId);
    if (!userResult.success || !userResult.data) {
      functions.logger.warn("User not found for user ID:", userId);
      return;
    }

    // Enroll user in each purchased item
    await enrollmentService.enrollUser(userResult.data, items, orderId);
    await pubsub.topic("send-mail").publishMessage({
      json: {
        name: userResult.data.firstName + " " + userResult.data.lastName,
        email: userResult.data.email,
        amount: order.amount,
        currency: order.currency,
        items: order.items,
        orderId: order.orderId,
        purchaseDate: order.createdAt.toString(),
      } as PaymentDetails,
    });
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
    razorpayWebhookMiddleware(RAZORPAY_WEBHOOK_SECRET),
    razorpayWebhookHandler
  )
);
