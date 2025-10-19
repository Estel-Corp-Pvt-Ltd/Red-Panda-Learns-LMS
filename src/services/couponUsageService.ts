import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";

import { db } from "@/firebaseConfig";
import { COLLECTION, COUPON_STATUS } from "@/constants";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";
import { toDateSafe } from "@/utils/date-time";
import { Coupon } from "@/types/coupon";

import { couponService } from "@/services/couponService";

import { CouponUsage } from "@/types/coupon";

/**
 * Service class for managing coupon usage tracking and validation.
 * Handles usage count, user-specific checks, and applicability logic.
 */
class CouponUsageService {
  /**
   * Returns the total number of times a coupon has been used.
   *
   * @param couponId - The unique coupon ID.
   * @returns A Result object containing the usage count.
   */
  async getUsageCountByCoupon(couponId: string): Promise<Result<number>> {
    try {
      const q = query(
        collection(db, COLLECTION.COUPON_USAGES),
        where("couponId", "==", couponId),
      );
      const snapshot = await getDocs(q);

      return ok(snapshot.size);
    } catch (error) {
      logError("CouponUsageService.getUsageCountByCoupon", error);
      return fail("Failed to get coupon usage count", error.code);
    }
  }

  /**
   * Checks if a user has already used a specific coupon.
   *
   * @param userId - The unique user ID.
   * @param couponId - The unique coupon ID.
   * @returns A Result object containing a boolean indicating prior usage.
   */
  async hasUserUsedCoupon(
    userId: string,
    couponId: string,
  ): Promise<Result<boolean>> {
    try {
      const q = query(
        collection(db, COLLECTION.COUPON_USAGES),
        where("userId", "==", userId),
        where("couponId", "==", couponId),
      );
      const snapshot = await getDocs(q);

      return ok(!snapshot.empty);
    } catch (error) {
      logError("CouponUsageService.hasUserUsedCoupon", error);
      return fail("Failed to check user coupon usage", error.code);
    }
  }

  /**
   * Validates whether a coupon is applicable for a given user and context.
   * Checks status, expiry, usage limits, user history, and linked items.
   *
   * @param userId - The unique user ID.
   * @param couponId - The unique coupon ID.
   * @param courseId - Optional course ID for applicability check.
   * @param bundleId - Optional bundle ID for applicability check.
   * @param cohortId - Optional cohort ID for applicability check.
   * @returns A Result object containing applicability status and optional reason for rejection.
   */
  async isCouponApplicable(
    userId: string,
    couponId: string,
    courseId?: string,
    bundleId?: string,
    cohortId?: string,
  ): Promise<Result<{ isApplicable: boolean; reason?: string }>> {
    try {
      const couponResult = await couponService.getCouponById(couponId);

      if (!couponResult.success || !couponResult.data) {
        return ok({ isApplicable: false, reason: "Coupon not found" });
      }

      const coupon = couponResult.data;

      // Check if user already used this coupon
      const alreadyUsedResult = await this.hasUserUsedCoupon(userId, couponId);
      if (alreadyUsedResult.success && alreadyUsedResult.data) {
        return ok({
          isApplicable: false,
          reason: "You have already used this coupon",
        });
      }

      // Check coupon status
      if (coupon.status !== COUPON_STATUS.ACTIVE) {
        return ok({ isApplicable: false, reason: "Coupon is inactive" });
      }

      // Check coupon expiry
      const now = new Date();
      const expiryDate = toDateSafe(coupon.expiryDate);

      if (expiryDate < now) {
        return ok({ isApplicable: false, reason: "Coupon has expired" });
      }

      // Check usage limit
      const usageCountResult = await this.getUsageCountByCoupon(couponId);
      if (usageCountResult.success) {
        const usageCount = usageCountResult.data;

        if (coupon.usageLimit > 0 && usageCount >= coupon.usageLimit) {
          return ok({ isApplicable: false, reason: "Usage limit reached" });
        }
      }

      // Check linked items (course, bundle, cohort)
      const isLinked = this.checkLinkedItems(
        coupon,
        courseId,
        bundleId,
        cohortId,
      );

      if (!isLinked) {
        return ok({
          isApplicable: false,
          reason: "Coupon not applicable to selected item",
        });
      }

      return ok({ isApplicable: true });
    } catch (error) {
      logError("CouponUsageService.isCouponApplicable", error);
      return fail("Error validating coupon", error.code);
    }
  }

  /**
   * Helper method to check if coupon is linked to the provided course, bundle, or cohort.
   * Returns true if coupon is universal or matches one of the provided IDs.
   *
   * @param coupon - The coupon object.
   * @param courseId - Optional course ID.
   * @param bundleId - Optional bundle ID.
   * @param cohortId - Optional cohort ID.
   * @returns Boolean indicating if the coupon is linked.
   */
  private checkLinkedItems(
    coupon: Coupon,
    courseId?: string,
    bundleId?: string,
    cohortId?: string,
  ): boolean {
    const linkedCourses = coupon.linkedCourseIds || [];
    const linkedBundles = coupon.linkedBundleIds || [];
    const linkedCohorts = coupon.linkedCohortIds || [];

    const cleanCourseId = courseId?.trim() || "";
    const cleanBundleId = bundleId?.trim() || "";
    const cleanCohortId = cohortId?.trim() || "";

    // Check if any provided ID matches linked IDs
    if (cleanCourseId && linkedCourses.includes(cleanCourseId)) {
      return true;
    }

    if (cleanBundleId && linkedBundles.includes(cleanBundleId)) {
      return true;
    }

    if (cleanCohortId && linkedCohorts.includes(cleanCohortId)) {
      return true;
    }

    // If no IDs provided, check if coupon is universal
    if (!cleanCourseId && !cleanBundleId && !cleanCohortId) {
      return (
        linkedCourses.length === 0 &&
        linkedBundles.length === 0 &&
        linkedCohorts.length === 0
      );
    }

    return false;
  }

  /**
   * Records a new coupon usage when a user redeems a coupon.
   *
   * @param usageData - The coupon usage data without the generated ID.
   * @returns A Result object containing the created usage record ID on success.
   */
  async recordCouponUsage(
    usageData: Omit<CouponUsage, "id">,
  ): Promise<Result<string>> {
    try {
      const usageRef = doc(collection(db, COLLECTION.COUPON_USAGES));

      const newUsage: CouponUsage = {
        ...usageData,
        id: usageRef.id,
        usedAt: Timestamp.now(),
      };

      await setDoc(usageRef, newUsage);

      return ok(usageRef.id);
    } catch (error) {
      logError("CouponUsageService.recordCouponUsage", error);
      return fail("Failed to record coupon usage", error.code);
    }
  }
}

export const couponUsageService = new CouponUsageService();
