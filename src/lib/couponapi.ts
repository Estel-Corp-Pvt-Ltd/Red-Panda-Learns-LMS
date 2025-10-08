import { Coupon } from "@/types/coupon";
import { couponService } from "@/services/couponService";

export const couponsApi = {
  /**
   * Get coupon by code (e.g. "WELCOME50")
   * @param code The coupon code string
   * @returns A Coupon object or null
   */
  getCouponByCode: async (code: string): Promise<Coupon | null> => {
    try {
      return await couponService.getCouponByCode(code);
    } catch (error) {
      console.error('couponsApi - Error fetching coupon by code:', error);
      return null;
    }
  },

  /**
   * Get coupon by ID (e.g. "coupon_12345678")
   * @param couponId The Firestore coupon document ID
   * @returns A Coupon object or null
   */
  getCouponById: async (couponId: string): Promise<Coupon | null> => {
    try {
      return await couponService.getCouponById(couponId);
    } catch (error) {
      console.error('couponsApi - Error fetching coupon by ID:', error);
      return null;
    }
  },

  /**
   * Get all coupons (optionally with filters in future)
   * @returns All coupons
   */
  getAllCoupons: async (): Promise<Coupon[]> => {
    try {
      return await couponService.getAllCoupons();
    } catch (error) {
      console.error('couponsApi - Error fetching all coupons:', error);
      return [];
    }
  },

  /**
   * Create a new coupon
   * @param data Coupon input data (without ID/timestamps)
   * @returns ID of newly created coupon
   */
  createCoupon: async (data: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    try {
      return await couponService.createCoupon(data);
    } catch (error) {
      console.error('couponsApi - Error creating coupon:', error);
      return null;
    }
  },

  /**
   * Update coupon details
   * @param couponId ID of the coupon to update
   * @param updates Partial update object
   */
  updateCoupon: async (couponId: string, updates: Partial<Coupon>): Promise<boolean> => {
    try {
      await couponService.updateCoupon(couponId, updates);
      return true;
    } catch (error) {
      console.error('couponsApi - Error updating coupon:', error);
      return false;
    }
  },

  /**
   * Delete a coupon by its ID
   * @param couponId Coupon document ID
   */
  deleteCoupon: async (couponId: string): Promise<boolean> => {
    try {
      await couponService.deleteCoupon(couponId);
      return true;
    } catch (error) {
      console.error('couponsApi - Error deleting coupon:', error);
      return false;
    }
  }
};
