import { COLLECTION } from '../constants';
import { Coupon } from '../types/coupon';
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
}

export const couponService = new CouponService();
