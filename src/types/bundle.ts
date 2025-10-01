import { BundleStatus, PricingModel } from "./general";
import { FieldValue, Timestamp } from "firebase-admin/firestore";


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
  authorId: string;
  authorName: string;
  status: BundleStatus;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};
