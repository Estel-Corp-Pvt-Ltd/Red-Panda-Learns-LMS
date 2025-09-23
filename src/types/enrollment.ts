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
  targetType: EnrolledProgramType; // "course" or "bundle"
  enrollmentDate: Date;
  status: EnrollmentStatus;
  role: UserRole;

  // For bundles → track per-course progress
  courseProgress?: LearningProgress[];

  // Always track main progress (for course = course’s progress, for bundle = overall aggregate)
  progress: LearningProgress;

  lastAccessed?: Date;
  completionDate?: Date;
  updatedAt: Date;

  // Top-level bundle/certificate status
  certificate: {
    issued: boolean;
    issuedAt?: Date | null;
    certificateId?: string;
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