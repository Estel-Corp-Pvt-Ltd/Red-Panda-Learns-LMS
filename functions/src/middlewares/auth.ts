import { Request, Response, NextFunction } from "express";
import * as admin from "firebase-admin";
import { defineSecret,  } from "firebase-functions/params";
import * as functions from "firebase-functions";
if (!admin.apps.length) {
  admin.initializeApp();
}

// Define the secret token parameter from Firebase secrets
// Set using: firebase functions:secrets:set API_SECRET_TOKEN

export const API_SECRET_TOKEN = defineSecret("API_SECRET_TOKEN");




export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: Missing token" });
      return;
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(token);

    // attach user to request
    (req as any).user = decoded;

    return next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

/**
 * API Key Authentication Middleware
 * 
 * Validates the Bearer token against the configured API_SECRET_TOKEN.
 * Returns 401 if token is missing or invalid.
 */
export const apiKeyAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: {
          message: "Unauthorized: Missing or invalid Authorization header",
          code: "AUTH_MISSING_TOKEN",
        },
      });
      return;
    }

    const token = authHeader.split("Bearer ")[1];
    console.log("Received API token:", token);
    // ✅ CORRECT
    const secretToken = API_SECRET_TOKEN.value();
    console.log("Configured secret token:", secretToken);

    console.log("Comparing tokens:", { token, secretToken });
    console.log("Token match:", token === secretToken);
    if (!secretToken) {
      functions.logger.error("API_SECRET_TOKEN not configured");
      res.status(500).json({
        success: false,
        error: {
          message: "Server configuration error",
          code: "CONFIG_ERROR",
        },
      });
      return;
    }

    if (token !== secretToken) {
      functions.logger.warn("Invalid API token attempt", { ip: req.ip });
      res.status(401).json({
        success: false,
        error: {
          message: "Unauthorized: Invalid token",
          code: "AUTH_INVALID_TOKEN",
        },
      });
      return;
    }

    next();
  } catch (error) {
    functions.logger.error("Auth middleware error", { error });
    res.status(500).json({
      success: false,
      error: {
        message: "Authentication error",
        code: "AUTH_ERROR",
      },
    });
  }
};

