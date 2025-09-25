import { Timestamp } from "firebase/firestore";

export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

export interface Coupon {
  id: string;
  code: string; 
  expiryDate: Timestamp;
  discountPercentage: number;
  status: CouponStatus;
  usageLimit: number;
  linkedCourseIds: string[];
  createdById: string; 
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CouponUsage {
  id: string;
  courseId: string;
  userId: string;
  usedAt: Timestamp;
  couponId: string;
}
