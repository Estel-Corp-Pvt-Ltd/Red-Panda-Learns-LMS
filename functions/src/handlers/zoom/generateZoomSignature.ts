import { Request, Response } from "express";
import { onRequest } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";
import crypto from "crypto";

import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";
import { COLLECTION } from "../../constants";
import * as admin from "firebase-admin";

const ZOOM_SDK_KEY = defineSecret("ZOOM_SDK_KEY");
const ZOOM_SDK_SECRET = defineSecret("ZOOM_SDK_SECRET");

interface ZoomSignatureRequest {
  meetingNumber: string;
  userId: string;
}

if (!admin.apps.length) admin.initializeApp();

type ZoomRole = 0 | 1;

async function getUserRole(userId: string): Promise<0 | 1> {
  const userDoc = await admin.firestore().collection(COLLECTION.USERS).doc(userId).get();

  if (!userDoc.exists) {
    throw new Error("User not found");
  }

  const role = userDoc.data()?.role;

  if (role === "ADMIN" || role === "INSTRUCTOR" || role === "TEACHER") {
    return 1; // host
  }

  return 0; // participant
}

function generateZoomMeetingSdkSignature(params: {
  meetingNumber: string;
  role: ZoomRole;
  sdkKey: string;
  sdkSecret: string;
}): string {
  if (!params.sdkSecret) {
    throw new Error("ZOOM_SDK_SECRET is not defined");
  }

  const now = Math.floor(Date.now() / 1000);
  const iat = now - 30;
  const exp = iat + 2 * 60 * 60; // 2 hours

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const payload = {
    appKey: params.sdkKey,
    mn: params.meetingNumber,
    role: params.role,
    iat,
    exp,
    tokenExp: exp,
  };

  const base64UrlEncode = (obj: object): string =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);

  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", params.sdkSecret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${signature}`;
}

async function generateZoomSignatureHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user; // set by authMiddleware
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { meetingNumber, userId } = req.body as ZoomSignatureRequest;

    if (!meetingNumber) {
      res.status(400).json({ error: "meetingNumber is required" });
      return;
    }

    const sdkKey = ZOOM_SDK_KEY.value();
    const sdkSecret = ZOOM_SDK_SECRET.value();

    const role = await getUserRole(userId);
    const signature = generateZoomMeetingSdkSignature({
      meetingNumber,
      role,
      sdkKey,
      sdkSecret,
    });

    res.status(200).json({
      signature,
      sdkKey,
      role,
    });
  } catch (error) {
    console.error("Zoom signature error", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export const generateZoomMeetingSignature = onRequest(
  {
    region: "us-central1",
    secrets: [ZOOM_SDK_KEY, ZOOM_SDK_SECRET],
  },
  withMiddleware(corsMiddleware, authMiddleware, generateZoomSignatureHandler)
);
