import * as functions from 'firebase-functions';
import { onRequest } from "firebase-functions/v2/https";
import { Request, Response } from "express";
import { withMiddleware } from "../middlewares";
import { rawBodyMiddleware } from "../middlewares/rawBody";
// import { paypalWebhookMiddleware } from "../middlewares/paypalWebhook";
// import { transactionService } from "../services/transactionService";
// import { orderService } from "../services/orderService";
// import { enrollmentService } from "../services/enrollService";
// import { paypalService } from "../services/paypalService";
// import { TRANSACTION_STATUS, ORDER_STATUS } from "../constants";
import { defineSecret } from "firebase-functions/params";

const PAYPAL_WEBHOOK_SECRET = defineSecret("PAYPAL_WEBHOOK_SECRET");

interface PayPalWebhookPayload {
  event_type: string;
  resource_version: string;
  resource: {
    id: string;
    status: string;
    intent?: string;
    purchase_units?: Array<{
      reference_id: string;
      payments?: {
        captures?: Array<{
          id: string;
          status: string;
          amount: {
            value: string;
            currency_code: string;
          };
        }>;
      };
    }>;
    amount?: {
      value: string;
      currency_code: string;
    };
    seller_protection?: {
      status: string;
      dispute_categories: string[];
    };
    create_time?: string;
    update_time?: string;
  };
  summary?: string;
}

const paypalWebhookHandler = async (req: Request, res: Response) => {
  try {
    const webhookPayload = req.body as PayPalWebhookPayload;

    if (!webhookPayload) {
      functions.logger.error("❌ No verified webhook payload", webhookPayload);
      res.status(200).json({ error: "No verified webhook payload" });
      return;
    }

    functions.logger.info("🔔 PayPal Webhook Received:", {
      event_type: webhookPayload.event_type,
      resource_id: webhookPayload.resource.id,
      resource_version: webhookPayload.resource_version
    });

    // Process webhook events
    switch (webhookPayload.event_type) {
      // case "CHECKOUT.ORDER.APPROVED":
      //   await handleCheckoutOrderApproved(webhookPayload);
      //   break;

      // case "PAYMENT.CAPTURE.COMPLETED":
      //   await handlePaymentCaptureCompleted(webhookPayload);
      //   break;

      // case "PAYMENT.CAPTURE.DENIED":
      // case "PAYMENT.CAPTURE.FAILED":
      //   await handlePaymentCaptureFailed(webhookPayload);
      //   break;

      // case "CHECKOUT.ORDER.COMPLETED":
      //   await handleCheckoutOrderCompleted(webhookPayload);
      //   break;

      default:
        functions.logger.info(`ℹ️ Unhandled PayPal event: ${webhookPayload.event_type}`);
    }
    functions.logger.info("🔔 PayPal Webhook Processed Successfully", { webhookPayload });
    res.status(200).json({ success: true, message: "PayPal webhook processed" });

  } catch (error: any) {
    functions.logger.error("❌ PayPal webhook processing failed:", error);
    res.status(500).json({ error: "PayPal webhook processing failed" });
  }
};

/**
 * User approved the payment - auto-capture it
//  */
// async function handleCheckoutOrderApproved(payload: PayPalWebhookPayload) {
//   const { resource } = payload;
//   const paypalOrderId = resource.id;

//   functions.logger.info("✅ PayPal Order Approved - Auto-capturing:", {
//     paypalOrderId,
//     status: resource.status,
//     intent: resource.intent,
//   });

//   try {
//     // Update transaction status to PROCESSING
//     const orderId = resource.purchase_units?.[0]?.reference_id;
//     if (orderId) {
//       await transactionService.updateTransactionStatusByOrderId(
//         orderId,
//         TRANSACTION_STATUS.PROCESSING,
//         {
//           paypalOrderId: paypalOrderId,
//           status: resource.status,
//           intent: resource.intent,
//         }
//       );
//     }

//     // Auto-capture the payment
//     const captureResult = await paypalService.capturePayment(paypalOrderId);

//     functions.logger.info("💰 PayPal Auto-capture Result:", {
//       paypalOrderId,
//       captureId: captureResult.id,
//       captureStatus: captureResult.status
//     });

//   } catch (error: any) {
//     functions.logger.error("❌ PayPal auto-capture failed:", error);

//     // Update transaction status to failed
//     const orderId = resource.purchase_units?.[0]?.reference_id;
//     if (orderId) {
//       await transactionService.updateTransactionStatusByOrderId(
//         orderId,
//         TRANSACTION_STATUS.FAILED,
//         {},
//         `Auto-capture failed: ${error.message}`
//       );
//     }
//   }
// }

// /**
//  * Payment successfully captured
//  */
// async function handlePaymentCaptureCompleted(payload: PayPalWebhookPayload) {
//   const { resource } = payload;

//   // Extract order ID from purchase_units
//   const orderId = resource.purchase_units?.[0]?.reference_id;
//   if (!orderId) {
//     functions.logger.error("❌ No order ID found in PayPal webhook");
//     return;
//   }

//   const capture = resource.purchase_units?.[0]?.payments?.captures?.[0];

//   functions.logger.info("💰 PayPal Payment Captured:", {
//     orderId,
//     paymentId: resource.id,
//     captureId: capture?.id,
//     amount: capture?.amount?.value,
//     currency: capture?.amount?.currency_code,
//     status: resource.status
//   });

//   try {
//     // Update transaction status
//     await transactionService.updateTransactionStatusByOrderId(
//       orderId,
//       TRANSACTION_STATUS.COMPLETED,
//       {
//         paymentId: capture?.id || resource.id,
//         status: resource.status,
//         amount: capture?.amount?.value ? parseFloat(capture.amount.value) : undefined,
//         currency: capture?.amount?.currency_code,
//         sellerProtection: resource.seller_protection,
//         capturedAt: resource.create_time || new Date().toISOString()
//       }
//     );

//     // Update order status
//     await orderService.updateOrderStatus(orderId, ORDER_STATUS.COMPLETED);

//     // Enroll user in courses
//     await enrollUserInPurchasedItems(orderId);

//     functions.logger.info("🎉 Payment processing completed:", { orderId });

//   } catch (error: any) {
//     functions.logger.error("❌ Failed to process completed payment:", error);
//   }
// }

// /**
//  * Payment capture failed
//  */
// async function handlePaymentCaptureFailed(payload: PayPalWebhookPayload) {
//   const { resource, event_type } = payload;
//   const orderId = resource.purchase_units?.[0]?.reference_id;

//   if (!orderId) {
//     functions.logger.error("❌ No order ID found in failed webhook");
//     return;
//   }

//   functions.logger.error("❌ PayPal Payment Failed:", {
//     orderId,
//     paymentId: resource.id,
//     eventType: event_type,
//     status: resource.status,
//   });

//   await transactionService.updateTransactionStatusByOrderId(
//     orderId,
//     TRANSACTION_STATUS.FAILED,
//     {
//       paymentId: resource.id,
//       status: resource.status,
//     },
//     `PayPal payment failed: ${event_type} - ${resource.status}`
//   );

//   await orderService.updateOrderStatus(orderId, ORDER_STATUS.FAILED);
// }

// /**
//  * Order completed (final state)
//  */
// async function handleCheckoutOrderCompleted(payload: PayPalWebhookPayload) {
//   const { resource } = payload;
//   const orderId = resource.purchase_units?.[0]?.reference_id;

//   if (!orderId) {
//     return;
//   }

//   functions.logger.info("🎊 PayPal Order Completed:", {
//     orderId,
//     status: resource.status,
//   });

//   // This is a final confirmation - ensure everything is completed
//   const transaction = await transactionService.getTransactionByOrderId(orderId);

//   if (transaction.success && transaction.data?.status !== TRANSACTION_STATUS.COMPLETED) {
//     functions.logger.warn("Order completed but transaction not marked completed:", { orderId });

//     // Force completion
//     await transactionService.updateTransactionStatusByOrderId(
//       orderId,
//       TRANSACTION_STATUS.COMPLETED,
//       {
//         status: resource.status,
//         completedVia: 'ORDER_COMPLETED_WEBHOOK'
//       }
//     );

//     await orderService.updateOrderStatus(orderId, ORDER_STATUS.COMPLETED);
//     await enrollUserInPurchasedItems(orderId);
//   }
// }

// /**
//  * Enroll user in purchased items
//  */
// async function enrollUserInPurchasedItems(orderId: string) {
//   try {
//     const orderResult = await orderService.getOrderById(orderId);
//     if (!orderResult.success || !orderResult.data) {
//       functions.logger.warn("Order not found for enrollment:", orderId);
//       return;
//     }

//     const order = orderResult.data;
//     const { userId, items } = order;

//     await enrollmentService.enrollUser(userId, items, orderId);

//     functions.logger.info("✅ User enrolled in purchased items:", {
//       userId,
//       orderId,
//       itemCount: items.length
//     });

//   } catch (error) {
//     functions.logger.error("❌ Failed to enroll user in purchased items:", error);
//   }
// }

export const paypalWebhook = onRequest(
  {
    region: "us-central1",
    secrets: [PAYPAL_WEBHOOK_SECRET],
    timeoutSeconds: 30
  },
  withMiddleware(
    rawBodyMiddleware,
    // paypalWebhookMiddleware(PAYPAL_WEBHOOK_SECRET.value()),
    paypalWebhookHandler
  )
);
