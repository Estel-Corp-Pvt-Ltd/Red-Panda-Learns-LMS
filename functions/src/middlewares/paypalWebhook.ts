import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import * as functions from 'firebase-functions';
import { defineSecret } from "firebase-functions/params";
const crc32 = require("buffer-crc32");
import fetch from "node-fetch";

// Certificate cache to avoid repeated downloads
const certificateCache = new Map<string, { cert: string, timestamp: number }>();
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Middleware to verify PayPal webhook signatures according to official documentation
 * This should be used before any PayPal webhook handler
 */
export const paypalWebhookMiddleware = (secretParam: ReturnType<typeof defineSecret>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only verify POST requests (webhooks are always POST)
    if (req.method !== "POST") {
      next();
      return;
    }

    const webhookId = secretParam.value();

    try {
      if (!webhookId) {
        functions.logger.error("❌ PayPal webhook ID not provided");
        res.status(500).json({
          error: "Webhook configuration error",
          message: "PayPal webhook ID not configured"
        });
        return;
      }

      // Get PayPal specific headers
      const transmissionId = req.headers["paypal-transmission-id"] as string;
      const transmissionTime = req.headers["paypal-transmission-time"] as string;
      const transmissionSig = req.headers["paypal-transmission-sig"] as string;
      const certUrl = req.headers["paypal-cert-url"] as string;
      const authAlgo = req.headers["paypal-auth-algo"] as string;

      // Validate required headers
      if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
        functions.logger.error("❌ Missing required PayPal webhook headers");
        res.status(401).json({
          error: "Unauthorized",
          message: "Missing PayPal webhook verification headers"
        });
        return;
      }

      // Validate auth algorithm
      if (authAlgo !== 'SHA256withRSA') {
        functions.logger.error(`❌ Unsupported auth algorithm: ${authAlgo}`);
        res.status(401).json({
          error: "Unauthorized",
          message: `Unsupported authentication algorithm: ${authAlgo}`
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

      // Verify the PayPal webhook signature using official method
      const isValid = await verifyPayPalWebhookSignature(
        rawBody,
        transmissionId,
        transmissionTime,
        transmissionSig,
        certUrl,
        webhookId
      );

      if (!isValid) {
        functions.logger.error("❌ Invalid PayPal webhook signature");
        res.status(401).json({
          error: "Unauthorized",
          message: "Invalid PayPal webhook signature"
        });
        return;
      }

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
 * Verify PayPal webhook signature using official PayPal method
 * Following: https://developer.paypal.com/api/rest/webhooks/
 */
async function verifyPayPalWebhookSignature(
  body: Buffer,
  transmissionId: string,
  transmissionTime: string,
  transmissionSig: string,
  certUrl: string,
  webhookId: string
): Promise<boolean> {
  try {
    // Step 1: Validate the certificate URL is from PayPal
    if (!isValidPayPalCertUrl(certUrl)) {
      functions.logger.error('❌ Invalid PayPal certificate URL:', certUrl);
      return false;
    }

    // Step 2: Download the certificate (with caching)
    const certPem = await downloadAndCacheCertificate(certUrl);
    if (!certPem) {
      functions.logger.error('❌ Failed to download PayPal certificate');
      return false;
    }

    // Step 3: Calculate CRC32 of the raw event data
    const crc = parseInt("0x" + crc32(body).toString('hex'));

    // Step 4: Create the message to verify (as per PayPal documentation)
    const message = `${transmissionId}|${transmissionTime}|${webhookId}|${crc}`;

    functions.logger.info(`🔐 Original signed message: ${message}`);

    // Step 5: Decode the base64 signature
    const signatureBuffer = Buffer.from(transmissionSig, 'base64');

    // Step 6: Create a verification object
    const verifier = crypto.createVerify('SHA256');
    verifier.update(message);

    // Step 7: Verify the signature using the certificate
    const isValid = verifier.verify(certPem, signatureBuffer);

    if (!isValid) {
      functions.logger.warn('❌ Signature verification failed');
    }

    return isValid;

  } catch (error) {
    functions.logger.error('❌ Error in PayPal signature verification:', error);
    return false;
  }
}

/**
 * Validate that the certificate URL is from PayPal
 */
function isValidPayPalCertUrl(certUrl: string): boolean {
  try {
    const url = new URL(certUrl);

    // Check domain - must be from PayPal
    const validDomains = [
      'api.paypal.com',
      'api-m.paypal.com',
      'api.sandbox.paypal.com',
      'api-m.sandbox.paypal.com'
    ];

    if (!validDomains.includes(url.hostname)) {
      functions.logger.error(`❌ Invalid certificate domain: ${url.hostname}`);
      return false;
    }

    // Check protocol - must be HTTPS
    if (url.protocol !== 'https:') {
      functions.logger.error(`❌ Invalid certificate protocol: ${url.protocol}`);
      return false;
    }

    // Check path - should be certificate endpoint
    if (!url.pathname.startsWith('/v1/notifications/certs/')) {
      functions.logger.error(`❌ Invalid certificate path: ${url.pathname}`);
      return false;
    }

    return true;
  } catch (error) {
    functions.logger.error('❌ Error validating certificate URL:', error);
    return false;
  }
}

/**
 * Download and cache PayPal certificate
 */
async function downloadAndCacheCertificate(certUrl: string): Promise<string | null> {
  try {
    // Check cache first
    const now = Date.now();
    const cached = certificateCache.get(certUrl);

    if (cached && (now - cached.timestamp) < CACHE_DURATION_MS) {
      functions.logger.info('✅ Using cached PayPal certificate');
      return cached.cert;
    }

    // Download the certificate
    functions.logger.info(`📥 Downloading PayPal certificate from: ${certUrl.substring(0, 50)}...`);

    const response = await fetch(certUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const certificate = await response.text();

    // Basic validation of certificate format
    if (!certificate.includes('-----BEGIN CERTIFICATE-----') ||
      !certificate.includes('-----END CERTIFICATE-----')) {
      functions.logger.error('❌ Invalid certificate format');
      return null;
    }

    // Cache the certificate
    certificateCache.set(certUrl, {
      cert: certificate,
      timestamp: now
    });

    functions.logger.info('✅ PayPal certificate downloaded and cached successfully');

    return certificate;
  } catch (error) {
    functions.logger.error('❌ Failed to download PayPal certificate:', error);
    return null;
  }
}
