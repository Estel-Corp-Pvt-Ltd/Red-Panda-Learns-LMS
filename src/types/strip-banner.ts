import { FieldValue, Timestamp } from "firebase/firestore";

export interface StripBanner {
  id: string;
  // Content
  title: string;
  subtitle?: string;
  
  // CTA
  ctaText: string;
  ctaLink: string;
  ctaActive: boolean;
  
  // Visual Design
  gradientStart: string;
  gradientEnd: string;
  gradientAngle?: number;
  textColor: string;
  
  // Timing & Behavior
  delaySeconds: number;
  slideDuration: number;
  dismissalHours: number;
  
  // Display Rules
  active: boolean;
  showOnDashboard: boolean;
  showOnLanding: boolean;
  showOnCoursePages: boolean;
  
  // Ordering
  displayOrder: number;
  
  // Metadata
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
  createdBy: string;
}