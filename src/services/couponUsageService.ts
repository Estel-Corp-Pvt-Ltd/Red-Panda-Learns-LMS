import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';
import { CouponUsage } from '@/types/coupon'
import { couponService } from '@/services/couponService';
import { COUPON_STATUS } from '@/constants';
import { formatDate, toDateSafe } from '@/utils/date-time';
class CouponUsageService {
  /**
   * Returns the total number of times a coupon has been used.
   */

  async getUsageCountByCoupon(couponId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'CouponUsage'),
        where('couponId', '==', couponId)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting coupon usage count:', error);
      return 0;
    }
  }

  /**
   * Checks if a user has already used a specific coupon.
   */
  async hasUserUsedCoupon(userId: string, couponId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'CouponUsage'),
        where('userId', '==', userId),
        where('couponId', '==', couponId)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking user coupon usage:', error);
      return false;
    }
  }

async isCouponApplicable(
  userId:string,
  couponId: string,
  courseId?: string,
  bundleId?: string,
  cohortId?: string
): Promise<{
  isApplicable: boolean;
  reason?: string;
}> {
  try {
    // console.log("🔍 Checking coupon applicability...");
    // console.log("📥 Inputs:");
    // console.log("➡️ couponId:", couponId);
    // console.log("➡️ courseId:", courseId);
    // console.log("➡️ bundleId:", bundleId);
    // console.log("➡️ cohortId:", cohortId);
  
    const coupon = await couponService.getCouponById(couponId);
    // console.log("🎫 Fetched coupon:", coupon);
   
    if (!coupon) {
      console.warn("⚠️ Coupon not found");
      return { isApplicable: false, reason: 'Coupon not found' };
    }

    const alreadyUsed = await this.hasUserUsedCoupon(userId,couponId)
    console.log("Log File of alreay used ", alreadyUsed)
    if(alreadyUsed){
      return{isApplicable : false , reason: 'You have already used this coupon'}
    }

    // Check coupon status
    if (coupon.status !== COUPON_STATUS.ACTIVE) {
      console.warn("⚠️ Coupon is inactive");
      return { isApplicable: false, reason: 'Coupon is inactive' };
    }

    // Check coupon expiry
    const now = new Date();
    const expiryDate = toDateSafe(coupon.expiryDate);
  
    if (expiryDate < now) {
      console.warn("⚠️ Coupon has expired");
      return { isApplicable: false, reason: 'Coupon has expired' };
    }

    // Check usage limit
    const usageCount = await this.getUsageCountByCoupon(couponId);
    // console.log("🔢 Usage count:", usageCount, " / Limit:", coupon.usageLimit);
   if (coupon.usageLimit > 0 && usageCount >= coupon.usageLimit) {
  console.warn("⚠️ Usage limit reached");
  return { isApplicable: false, reason: 'Usage limit reached' };
}


    // Start checking if coupon is linked to course, bundle, or cohort
    let isLinked = false;
    console.log("🔗 Checking linked items...");

    const linkedCourses = coupon.linkedCourseIds || [];
    const linkedBundles = coupon.linkedBundleIds || [];
    const linkedCohorts = coupon.linkedCohortIds || [];

    const cleanCourseId = typeof courseId === 'string' ? courseId.trim() : '';
    const cleanBundleId = typeof bundleId === 'string' ? bundleId.trim() : '';
    const cleanCohortId = typeof cohortId === 'string' ? cohortId.trim() : '';

    // console.log("🧹 Cleaned IDs:");
    // console.log("➡️ cleanCourseId:", cleanCourseId);
    // console.log("➡️ cleanBundleId:", cleanBundleId);
    // console.log("➡️ cleanCohortId:", cleanCohortId);

    if (cleanCourseId && linkedCourses.includes(cleanCourseId)) {
      console.log("✅ Matched courseId");
      isLinked = true;
    } else if (cleanBundleId && linkedBundles.includes(cleanBundleId)) {
      // console.log("✅ Matched bundleId");
      isLinked = true;
    } else if (cleanCohortId && linkedCohorts.includes(cleanCohortId)) {
      console.log("✅ Matched cohortId");
      isLinked = true;
    }

    // If no IDs provided, check if coupon is universal
    if (!cleanCourseId && !cleanBundleId && !cleanCohortId) {
      console.log("🔎 No IDs provided — checking if coupon is universal...");
      isLinked =
        linkedCourses.length === 0 &&
        linkedBundles.length === 0 &&
        linkedCohorts.length === 0;
      console.log("🧮 Universal coupon result:", isLinked);
    }

    return { isApplicable : true}
    } catch (error) {
      console.error("💥 Error checking coupon applicability:", error);
      return { isApplicable: false, reason: 'Error validating coupon' };
    }
  }





  /**
   * Records a new coupon usage (call this when a user redeems a coupon).
   */
  async recordCouponUsage(usageData: Omit<CouponUsage, 'id'>): Promise<string> {
    try {
      const usageRef = doc(collection(db, 'CouponUsage'));
      const newUsage: CouponUsage = {
        ...usageData,
        id: usageRef.id,
        usedAt: Timestamp.now(),
      };

      await setDoc(usageRef, newUsage);
      console.log("Data for coupon Usage", newUsage)
      console.log('Coupon usage recorded:', usageRef.id);
      return usageRef.id;
    } catch (error) {
      console.error('Error recording coupon usage:', error);
      throw new Error('Failed to record coupon usage');
    }
  }
}

export const couponUsageService = new CouponUsageService();
