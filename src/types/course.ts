import { FieldValue, Timestamp } from "firebase/firestore";
import { CourseStatus, Duration, PricingModel } from "./general";
import { LearningContentType } from "./lesson";

export interface TopicItem {
  id: string;
  type: LearningContentType;
  title: string;
}

export interface Topic {
  id: string;
  title: string;
  items: TopicItem[];
}

export interface Cohort {
  id: string;
  title: string;
  description?: string;
  topics: Topic[];
  price: number;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface Enrollment {
  id: string; // enrollment document id
  userId: string;
  cohortId: string;
  status: "active" | "inactive" | "pending"; // or other statuses you want
  enrolledAt: Date;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  duration: Duration;
  thumbnail?: string;
  regularPrice: number;
  salePrice: number;
  pricingModel: PricingModel;
  categoryIds: string[];
  targetAudienceIds: string[];
  tags: string[];
  instructorId: string;
  instructorName: string;
  status: CourseStatus;
  certificateTemplateId?: string;
  topics: Topic[];
  isEnrollmentPaused: boolean;
  isMailSendingEnabled: boolean;
  isCertificateEnabled: boolean;
  customCertificateName: string; // To Specify a custom name for the course certificate default is course title
  isForumEnabled: boolean;
  isWelcomeMessageEnabled: boolean;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}
