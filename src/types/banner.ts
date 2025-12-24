import { FieldValue, Timestamp } from "firebase/firestore";
import { BannerStatus } from "./general";

export interface Banner {
  id: string;
  title: string;
  description: string;
  ctaTitle: string;
  ctaLink: string;
  imageUrl?: string | null;
  gradientColors: string[]; // Array of 2-3 hex colors for fallback gradient
  courseIds: string[]; // Array of course IDs - only show to users enrolled in these courses
  status: BannerStatus; // "ACTIVE" | "INACTIVE"
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  createdBy: string | null;
};

export interface BannerFormData {
  title: string;
  description: string;
  ctaTitle: string;
  ctaLink: string;
  imageUrl?: string | null;
  gradientColors: string[];
  courseIds: string[];
  status: BannerStatus;
};
