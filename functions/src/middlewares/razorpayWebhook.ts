import { Request, Response, NextFunction } from "express";
import { defineSecret } from "firebase-functions/params";
import crypto from "crypto";
import * as functions from 'firebase-functions';

/**
 * Middleware to verify Razorpay webhook signatures
 * This should be used before any webhook handler
 */
export const razorpayWebhookMiddleware = (secretParam: ReturnType<typeof defineSecret>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== "POST") {
      next();
      return;
    }
    const webhookSecret = secretParam.value();
    try {
      if (!webhookSecret) {
        functions.logger.error("❌ Webhook secret not provided");
        res.status(500).json({
          error: "Webhook configuration error",
          message: "Webhook secret not configured"
        });
        return;
      }

      // Get the signature from headers
      const signature = req.headers["x-razorpay-signature"] as string;

      if (!signature) {
        functions.logger.error("❌ Missing Razorpay signature header");
        res.status(401).json({
          error: "Unauthorized",
          message: "Missing webhook signature"
        });
        return;
      }

      // Get the raw request body as Buffer
      const rawBody = (req as any).rawBody as Buffer;

      if (!rawBody || rawBody.length === 0) {
        functions.logger.error("❌ Empty webhook body");
        res.status(400).json({
          error: "Bad Request",
          message: "Empty webhook payload"
        });
        return;
      }

      // Verify the signature - pass the Buffer directly
      const isValid = verifySignature(rawBody, signature, webhookSecret);

      if (!isValid) {
        functions.logger.error("❌ Invalid webhook signature");
        functions.logger.info("Signature verification failed", {
          receivedSignature: signature.substring(0, 16) + '...',
          secretLength: webhookSecret.length,
          bodyLength: rawBody.length
        });
        res.status(200).json({
          error: "Unauthorized",
          message: "Invalid webhook signature"
        });
        return;
      }

      functions.logger.info("✅ Razorpay webhook signature verified successfully");
      next();

    } catch (error: any) {
      functions.logger.error("❌ Webhook verification failed:", error);
      res.status(200).json({
        error: "Internal Server Error",
        message: "Webhook verification failed"
      });
    }
  };
};

/**
 * Verify Razorpay webhook signature
 */
function verifySignature(body: Buffer, signature: string, secret: string): boolean {
  try {
    // Remove 'sha256=' prefix if present
    const receivedSignature = signature.replace('sha256=', '');

    // Compute expected signature - use the Buffer directly
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    // Compare signatures using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  } catch (error) {
    functions.logger.error('❌ Error in signature verification:', error);
    return false;
  }
}
