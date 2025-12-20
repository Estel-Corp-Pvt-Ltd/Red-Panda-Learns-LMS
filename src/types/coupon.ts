import { Timestamp, FieldValue } from "firebase/firestore";
import { CouponStatus } from "./general";

export interface Coupon {
  id: string;
  code: string;
  expiryDate: Timestamp | FieldValue;
  discountPercentage: number;
  status: CouponStatus;
  usageLimit: number;
  totalUsed: number;
  linkedCourseIds: string[];
  linkedBundleIds: string[];
  createdById: string;
  createdbyMail: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};

export interface CouponUsage {
  id: string;
  userId: string;
  couponId: string;
  usedAt: Timestamp | FieldValue;
  refId: string;
  refType: "COURSE" | "BUNDLE";
};
