import { CourseStatus, PricingModel } from "./general";

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
  startDate: Date;
  endDate: Date;
  enrollmentOpen: boolean;

  // Optional metadata for enrollment control
  maxStudents?: number;            // max allowed students in cohort (if any)
  requireEnrollment?: boolean;     // does cohort require enrollment approval?
  requireCohortAccess?: boolean;   // does cohort content require special access?

  // Admin/analytics info
  cohortEnrollments?: number;      // number of enrolled students (count)
  
  // Auditing
  createdAt: Date;
  updatedAt: Date;
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
    createdAt: Date;
    updatedAt: Date;
};


