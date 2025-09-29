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
  linkedBundleIds:string[];
  linkedCohortIds:string[];
  createdById: string; 
  createdbyMail:string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CouponUsage {
  id: string; 
  userId: string;
  couponId: string; 
  usedAt: Timestamp;
  courseId?: string;
  bundleId?: string;
  cohortId?: string;
}