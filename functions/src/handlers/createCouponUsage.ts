import { Request, Response } from "express";
import { onRequest } from "firebase-functions/v2/https";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import admin from "firebase-admin";
import { COLLECTION } from "../constants";

async function createCouponUsageHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user; // from auth middleware
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { promoCode, items } = req.body;

    if (!promoCode || !Array.isArray(items)) {
      res.status(400).json({
        error: "Missing required fields: promoCode, items[]",
      });
      return;
    }

    const db = admin.firestore();

    // 1. Find coupon by code
    const snap = await db
      .collection(COLLECTION.COUPONS)
      .where("code", "==", promoCode)
      .limit(1)
      .get();

    if (snap.empty) {
      res.status(404).json({ error: "Coupon not found" });
      return;
    }

    const couponDoc = snap.docs[0];
    const couponId = couponDoc.id;

    // 2. Create batch writes
    const batch = db.batch();
    const usageRef = db.collection(COLLECTION.COUPON_USAGES);

    items.forEach((item: any) => {
      const docRef = usageRef.doc();
      batch.set(docRef, {
        userId: user.uid,
        couponId,
        refId: item.itemId || item.id,
        refType: item.itemType || "product",
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // 3. Update coupon usage total
    batch.update(db.collection(COLLECTION.COUPONS).doc(couponId), {
      usageTotal: admin.firestore.FieldValue.increment(items.length),
    });

    await batch.commit();

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Coupon usage error:", err);
    res.status(500).json({ error: "Internal error", details: err.message });
  }
}

export const createCouponUsage = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, createCouponUsageHandler)
);
