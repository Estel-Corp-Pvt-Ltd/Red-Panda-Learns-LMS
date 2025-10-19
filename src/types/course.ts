import { CourseStatus, PricingModel } from "./general";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { LearningContentType } from "./lesson";

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
  categoryIds: string[];
  targetAudienceIds: string[];
  id: string;
  title: string;
  url: string;
  description: string;
  thumbnail?: string;
  regularPrice: number;
  salePrice: number;
  pricingModel: PricingModel;
  tags: string[];
  authorId: string;
  authorName: string;
  status: CourseStatus;
  certificateTemplateId?: string;
  cohorts: Cohort[];
  topics: Topic[];
  isEnrollmentPaused: boolean;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};
