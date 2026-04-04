import { Coupon } from "@/types/coupon";
import { couponService } from "@/services/couponService";

export const couponsApi = {
  /**
   * Get coupon by code (e.g. "WELCOME50")
   * @param code The coupon code string
   * @returns A Coupon object or null
   */
  getCouponByCode: async (code: string): Promise<Coupon | null> => {
    const result = await couponService.getCouponByCode(code);
    if (result.success) {
      return result.data;
    }
    return null;
  },

  /**
   * Get coupon by ID (e.g. "coupon_12345678")
   * @param couponId The Firestore coupon document ID
   * @returns A Coupon object or null
   */
  getCouponById: async (couponId: string): Promise<Coupon | null> => {
    const result = await couponService.getCouponById(couponId);
    if (result.success) {
      return result.data;
    }
    return null;
  },

  /**
   * Get all coupons (optionally with filters in future)
   * @returns All coupons
   */
  getAllCoupons: async (): Promise<Coupon[]> => {
    const result = await couponService.getAllCoupons();
    if (result.success) {
      return result.data;
    }
    return [];
  },

  /**
   * Create a new coupon
   * @param data Coupon input data (without ID/timestamps)
   * @returns ID of newly created coupon
   */
  createCoupon: async (data: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    const result = await couponService.createCoupon(data);
    if (result.success) {
      return result.data;
    }
    return null;
  },

  /**
   * Update coupon details
   * @param couponId ID of the coupon to update
   * @param updates Partial update object
   */
  updateCoupon: async (couponId: string, updates: Partial<Coupon>): Promise<boolean> => {
    const result = couponService.updateCoupon(couponId, updates);
    if ((await result).success) {
      return true;
    }
    return false;
  },

  /**
   * Delete a coupon by its ID
   * @param couponId Coupon document ID
   */
  deleteCoupon: async (couponId: string): Promise<boolean> => {
    const result = await couponService.deleteCoupon(couponId);
    if (result.success) {
      return true;
    }
    return false;
  }
};
