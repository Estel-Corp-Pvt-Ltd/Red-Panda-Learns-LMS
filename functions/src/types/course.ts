import { FieldValue, Timestamp } from "firebase/firestore";
import { CourseStatus, Duration, PricingModel } from "./general";
import { LEARNING_CONTENT } from "../constants";

export type LearningContentType = typeof LEARNING_CONTENT[keyof typeof LEARNING_CONTENT]

export interface TopicItem {
  id: string;
  type: LearningContentType;
  title: string;
};

export interface Topic {
  id: string;
  title: string;
  items: TopicItem[];
};

export interface Cohort {
  id: string;
  title: string;
  description?: string;
  topics: Topic[];
  price: number;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
};

export interface Enrollment {
  id: string;           // enrollment document id
  userId: string;
  cohortId: string;
  status: 'active' | 'inactive' | 'pending'; // or other statuses you want
  enrolledAt: Date;
};

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
  cohorts: Cohort[];
  topics: Topic[];
  isEnrollmentPaused: boolean;
  isMailSendingEnabled:boolean;
  isCertificateEnabled:boolean;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};
