import {
  Currency,
  EnrolledProgramType,
  EnrollmentStatus,
  PaymentProvider,
  PaymentStatus,
  PricingModel,
  UserRole
} from "./general";
import { LearningProgress } from "./progress";

export interface Enrollment {
  id: string;
  userId: string;

  targetId: string;                // courseId OR bundleId
  targetType: EnrolledProgramType; // "course" | "bundle"
  enrollmentDate: Date;
  status: EnrollmentStatus;
  role: UserRole;

  // only relevant if this enrollment is a bundle
  bundleCourseIds?: string[];
  courseProgress?: LearningProgress[]; // progress per course inside bundle

  // always track main progress (if course → this is the course progress, if bundle → overall bundle progress)
  progress: {
    completedLessons: number;
    lessonHistory: string[];
    totalLessons: number;
    percentage: number;
  };

  lastAccessed?: Date;
  completionDate?: Date;
  updatedAt: Date;

  certificate: {
    issued: boolean;
    issuedAt?: Date;
  };

  grade?: number | string | null;
  pricingModel: PricingModel;

  payment?: {
    status: PaymentStatus;
    actualAmount: number;
    currency: Currency;
    amountPaid: number;
    balance: number;
    transactionId?: string;
    provider: PaymentProvider;
    paidAt?: Date;
  };
}