import { CourseStatus, PricingModel } from "./general";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export interface TopicItem {
    id: string;
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
  startDate: Timestamp | FieldValue| Date | null;
  endDate: Timestamp | FieldValue| Date | null;
  enrollmentOpen: boolean;
  price : number;
  // Optional metadata for enrollment control
  maxStudents?: number;            // max allowed students in cohort (if any)
  requireEnrollment?: boolean;     // does cohort require enrollment approval?
  requireCohortAccess?: boolean;   // does cohort content require special access?

  // Admin/analytics info
  cohortEnrollments?: number;      // number of enrolled students (count)
   enrollmentIds?: string[]; 
  
  // Auditing
  createdAt: Timestamp | FieldValue | Date | null;
  updatedAt: Timestamp | FieldValue | Date | null;
}


export interface Enrollment {
  id: string;           // enrollment document id
  userId: string;
  cohortId: string;
  status: 'active' | 'inactive' | 'pending'; // or other statuses you want
  enrolledAt: Date;
}

export interface Course {
    id: string;
    title: string;
    url: string;
    description: string;
    regularPrice: number;
    salePrice: number;
    pricingModel: PricingModel;
    tags: string[];
    categories: string[];
    authorId: string;
    authorName: string;
    status: CourseStatus;
    certificateTemplateId?: string;
    cohorts: Cohort[];
    topics: Topic[];
    isEnrollmentPaused: boolean;
    createdAt: Timestamp | FieldValue| Date | null ;
    updatedAt: Timestamp | FieldValue| Date | null ;
};


