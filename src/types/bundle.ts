import { FieldValue, Timestamp } from "firebase/firestore";
import { BundleStatus, PricingModel } from "./general";

export type BundleCourseItem = {
  id: string;
  title: string;
};

export interface Bundle {
  id: string;
  title: string;
  description: string;
  slug: string;
  regularPrice: number;
  salePrice: number;
  courses: BundleCourseItem[];
  pricingModel: PricingModel;
  categoryIds: string[];
  targetAudienceIds: string[];
  tags: string[];
  instructorId: string;
  instructorName: string;
  thumbnail?: string;
  status: BundleStatus;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}
