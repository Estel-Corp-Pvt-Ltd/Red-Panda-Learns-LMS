import { FieldValue, Timestamp } from "firebase/firestore";
import { BundleStatus, PricingModel } from "./general";

export interface BundleEnrollment {
  id: string;
  userId: string;
  bundleId: string;
  enrolledAt: Timestamp | FieldValue;
  paymentId?: string;
  paymentProvider?: string;
  amount: number;
  status: 'active' | 'suspended' | 'completed';
  enrolledCourseIds: string[]; // Individual course enrollments created
}

export type BundleCourseItem = {
  id: string;
  title: string;
};

export interface Bundle {
  id: string;
  title: string;
  description: string;
  regularPrice: number;
  salePrice: number;
  courses: BundleCourseItem[];
  pricingModel: PricingModel;
  categories: string[];
  tags: string[];
  instructorId: string;
  instructorName: string;
  status: BundleStatus;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};
