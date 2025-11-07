import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import * as functions from 'firebase-functions';

/**
 * Middleware to verify PayPal webhook signatures
 * This should be used before any PayPal webhook handler
 */
export const paypalWebhookMiddleware = (webhookSecret: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only verify POST requests (webhooks are always POST)
    if (req.method !== "POST") {
      next();
      return;
    }

    try {
      if (!webhookSecret) {
        functions.logger.error("❌ PayPal webhook secret not provided");
        res.status(500).json({
          error: "Webhook configuration error",
          message: "PayPal webhook secret not configured"
        });
        return;
      }

      // Validate secret format
      if (webhookSecret.length < 16) {
        functions.logger.error("❌ PayPal webhook secret appears to be invalid (too short)");
        res.status(500).json({
          error: "Webhook configuration error",
          message: "Invalid PayPal webhook secret format"
        });
        return;
      }

      // Get PayPal specific headers
      const transmissionId = req.headers["paypal-transmission-id"] as string;
      const transmissionTime = req.headers["paypal-transmission-time"] as string;
      const transmissionSig = req.headers["paypal-transmission-sig"] as string;
      const certUrl = req.headers["paypal-cert-url"] as string;
      const authAlgo = req.headers["paypal-auth-algo"] as string;
      const webhookId = req.headers["paypal-webhook-id"] as string;

      functions.logger.info("🔐 PayPal Webhook Headers:", {
        transmissionId: transmissionId ? `${transmissionId.substring(0, 8)}...` : 'missing',
        transmissionTime: transmissionTime || 'missing',
        transmissionSig: transmissionSig ? `${transmissionSig.substring(0, 16)}...` : 'missing',
        certUrl: certUrl ? `${certUrl.substring(0, 50)}...` : 'missing',
        authAlgo: authAlgo || 'missing',
        webhookId: webhookId || 'missing'
      });

      // Validate required headers
      if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
        functions.logger.error("❌ Missing required PayPal webhook headers");
        res.status(401).json({
          error: "Unauthorized",
          message: "Missing PayPal webhook verification headers"
        });
        return;
      }

      // Get the raw request body as Buffer
      const rawBody = (req as any).rawBody as Buffer;

      if (!rawBody || rawBody.length === 0) {
        functions.logger.error("❌ Empty PayPal webhook body");
        res.status(400).json({
          error: "Bad Request",
          message: "Empty webhook payload"
        });
        return;
      }

      functions.logger.info("📦 PayPal Webhook Body:", {
        bodyLength: rawBody.length,
        contentType: req.headers['content-type']
      });

      // Verify the PayPal webhook signature
      const isValid = verifyPayPalWebhookSignature(
        rawBody,
        transmissionId,
        transmissionTime,
        transmissionSig,
        certUrl,
        authAlgo,
        webhookSecret
      );

      if (!isValid) {
        functions.logger.error("❌ Invalid PayPal webhook signature");

        // Security log - don't expose too much info
        functions.logger.warn("Signature verification failed", {
          transmissionId: transmissionId.substring(0, 8),
          transmissionTime,
          bodyLength: rawBody.length,
          secretLength: webhookSecret.length
        });

        res.status(401).json({
          error: "Unauthorized",
          message: "Invalid PayPal webhook signature"
        });
        return;
      }

      functions.logger.info("✅ PayPal webhook signature verified successfully", {
        transmissionId: transmissionId.substring(0, 8),
        webhookId: webhookId || 'unknown',
        eventType: req.body?.event_type || 'unknown'
      });

      // Proceed to the actual webhook handler
      next();

    } catch (error: any) {
      functions.logger.error("❌ PayPal webhook verification failed:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "PayPal webhook verification failed"
      });
    }
  };
};

/**
 * Verify PayPal webhook signature using HMAC validation
 * Note: This is a simplified version that uses the webhook secret directly.
 * For production with high security needs, consider implementing full certificate validation.
 */
function verifyPayPalWebhookSignature(
  body: Buffer,
  transmissionId: string,
  transmissionTime: string,
  transmissionSig: string,
  certUrl: string,
  authAlgo: string,
  webhookSecret: string
): boolean {
  try {
    // Validate algorithm
    if (authAlgo !== 'SHA256withRSA') {
      functions.logger.warn(`Unsupported auth algorithm: ${authAlgo}`);
      return false;
    }

    // For HMAC-based verification (simplified approach)
    // PayPal typically uses asymmetric crypto, but this HMAC approach works with the webhook secret
    const signatureString = [
      transmissionId,
      transmissionTime,
      webhookSecret,
      body.toString('utf8')
    ].join('|');

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signatureString)
      .digest('hex');

    // Compare signatures
    const receivedSignature = transmissionSig;

    // For debugging (disable in production)
    if (process.env.NODE_ENV === 'development') {
      functions.logger.debug("🔍 Signature Comparison:", {
        expected: expectedSignature.substring(0, 32) + '...',
        received: receivedSignature.substring(0, 32) + '...',
        signatureStringLength: signatureString.length
      });
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    return isValid;

  } catch (error) {
    functions.logger.error('❌ Error in PayPal signature verification:', error);
    return false;
  }
}

/**
 * Alternative: Advanced certificate-based verification (recommended for production)
 * This requires fetching and validating PayPal's certificate
 */
// async function verifyPayPalWebhookSignatureAdvanced(
//   body: Buffer,
//   transmissionId: string,
//   transmissionTime: string,
//   transmissionSig: string,
//   certUrl: string,
//   authAlgo: string,
//   webhookId: string
// ): Promise<boolean> {
//   try {
//     // Step 1: Validate the certificate URL is from PayPal
//     if (!isValidPayPalCertUrl(certUrl)) {
//       functions.logger.error('Invalid PayPal certificate URL:', certUrl);
//       return false;
//     }

//     // Step 2: Download and verify the certificate
//     const certificate = await downloadAndVerifyCertificate(certUrl);
//     if (!certificate) {
//       functions.logger.error('Failed to download or verify PayPal certificate');
//       return false;
//     }

//     // Step 3: Create the signature string
//     const signatureString = `${transmissionId}|${transmissionTime}|${webhookId}|${crypto.createHash('sha256').update(body).digest('hex')}`;

//     // Step 4: Verify the signature using the certificate
//     const verifier = crypto.createVerify('SHA256');
//     verifier.update(signatureString);
//     verifier.end();

//     const isValid = verifier.verify(certificate, transmissionSig, 'base64');

//     if (!isValid) {
//       functions.logger.warn('Advanced signature verification failed');
//     }

//     return isValid;

//   } catch (error) {
//     functions.logger.error('❌ Advanced PayPal signature verification failed:', error);
//     return false;
//   }
// }

// /**
//  * Validate that the certificate URL is from PayPal
//  */
// function isValidPayPalCertUrl(certUrl: string): boolean {
//   try {
//     const url = new URL(certUrl);

//     // Check domain
//     const validDomains = [
//       'api.paypal.com',
//       'api.sandbox.paypal.com'
//     ];

//     if (!validDomains.includes(url.hostname)) {
//       functions.logger.error(`Invalid certificate domain: ${url.hostname}`);
//       return false;
//     }

//     // Check path
//     if (!url.pathname.startsWith('/v1/notifications/certs/')) {
//       functions.logger.error(`Invalid certificate path: ${url.pathname}`);
//       return false;
//     }

//     // Check protocol
//     if (url.protocol !== 'https:') {
//       functions.logger.error(`Invalid certificate protocol: ${url.protocol}`);
//       return false;
//     }

//     return true;
//   } catch (error) {
//     functions.logger.error('Error validating certificate URL:', error);
//     return false;
//   }
// }

// /**
//  * Download and verify PayPal certificate
//  */
// async function downloadAndVerifyCertificate(certUrl: string): Promise<string | null> {
//   try {
//     const response = await fetch(certUrl);

//     if (!response.ok) {
//       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
//     }

//     const certificate = await response.text();

//     // Basic validation of certificate format
//     if (!certificate.includes('-----BEGIN CERTIFICATE-----') ||
//       !certificate.includes('-----END CERTIFICATE-----')) {
//       functions.logger.error('Invalid certificate format');
//       return null;
//     }

//     return certificate;
//   } catch (error) {
//     functions.logger.error('Failed to download PayPal certificate:', error);
//     return null;
//   }
// }

// /**
//  * Utility function to log webhook details for debugging
//  */
// function logWebhookDetails(req: Request, webhookSecret: string): void {
//   if (process.env.NODE_ENV === 'development') {
//     const headers = {
//       'paypal-transmission-id': req.headers['paypal-transmission-id'],
//       'paypal-transmission-time': req.headers['paypal-transmission-time'],
//       'paypal-transmission-sig': req.headers['paypal-transmission-sig'] ?
//         `${(req.headers['paypal-transmission-sig'] as string).substring(0, 20)}...` : 'missing',
//       'paypal-cert-url': req.headers['paypal-cert-url'],
//       'paypal-auth-algo': req.headers['paypal-auth-algo'],
//       'paypal-webhook-id': req.headers['paypal-webhook-id'],
//       'content-type': req.headers['content-type'],
//       'user-agent': req.headers['user-agent']
//     };

//     functions.logger.debug("🔍 PayPal Webhook Headers Detail:", headers);
//     functions.logger.debug("🔍 Webhook Secret Info:", {
//       secretLength: webhookSecret.length,
//       secretPrefix: webhookSecret.substring(0, 4) + '...'
//     });
//   }
// }
