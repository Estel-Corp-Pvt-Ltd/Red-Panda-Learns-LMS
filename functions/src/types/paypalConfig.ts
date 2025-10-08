// types/paypalConfig.ts
import * as admin from "firebase-admin";

export interface PayPalAccessToken {
  token: string;
  expiresAt: admin.firestore.Timestamp;
}
