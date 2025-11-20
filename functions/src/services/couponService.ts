import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTION } from '../constants';
import { Coupon, CouponUsage } from '../types/coupon';
import { ok, fail, Result } from '../utils/response';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

class CouponService {
  async getCouponByCode(code: string): Promise<Result<Coupon | null>> {
    try {
      const couponSnapshot = await db.collection(COLLECTION.COUPONS)
        .where('code', '==', code)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();

      if (couponSnapshot.empty) {
        return fail("Coupon not found");
      }

      const couponDoc = couponSnapshot.docs[0];
      const data = couponDoc.data();

      const coupon: Coupon = {
        id: couponDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate(),
        expiryDate: data?.expiryDate?.toDate(),
      } as Coupon;

      return ok(coupon);
    } catch (error) {
      return fail('Failed to fetch coupon');
    }
  }

  async updateCouponUsageTotal(couponId: string, incrementBy: number): Promise<Result<null>> {
    try {
      const couponRef = db.collection(COLLECTION.COUPONS).doc(couponId);
      await couponRef.update({
        totalUsed: FieldValue.increment(incrementBy),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return ok(null);
    } catch {
      return fail("Failed to update coupon usage total");
    }
  }

  async createCouponUsages(
    usages: Array<Omit<CouponUsage, "id">>
  ): Promise<Result<null>> {
    try {
      const batch = db.batch();
      const col = db.collection(COLLECTION.COUPON_USAGES);

      for (const usage of usages) {
        const id = usage.userId + "_" + usage.couponId;
        const ref = col.doc(id);
        batch.set(ref, usage);
      }

      await batch.commit();
      return ok(null);
    } catch (e) {
      console.error(e);
      return fail("Failed to create coupon usages");
    }
  }

  async getCouponUsageByUserAndCoupon(userId: string, couponId: string): Promise<Result<CouponUsage | null>> {
    try {
      const usageRef = db.collection(COLLECTION.COUPON_USAGES)
        .where('userId', '==', userId)
        .where('couponId', '==', couponId)
        .limit(1);

      const snapshot = await usageRef.get();

      if (snapshot.empty) {
        return fail("Coupon usage not found");
      }

      const usageDoc = snapshot.docs[0];
      const data = usageDoc.data();

      const usage: CouponUsage = {
        id: usageDoc.id,
        ...data,
        usedAt: data?.usedAt?.toDate(),
      } as CouponUsage;

      return ok(usage);
    } catch (error) {
      return fail("Failed to fetch coupon usage");
    }
  }
}

export const couponService = new CouponService();
