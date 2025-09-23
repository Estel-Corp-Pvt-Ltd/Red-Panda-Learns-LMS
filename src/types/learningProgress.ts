import { EnrollmentStatus, PaymentStatus, PaymentProvider, Currency } from "./general";

/**
 * Learning progress and certification always represents a single course's progress
 */
export interface LearningProgress {
  id?: string;
  courseId?: string;
  currentLessonId?: string | null;
  lastAccessed?: Date | null;

  completedLessons: number;
  lessonHistory: string[];
  totalLessons: number;
  percentage: number;

  // Certification info
  certification: {
    issued: boolean;
    issuedAt?: Date | null;
    certificateId?: string;
  };

  completionDate?: Date;
  updatedAt: Date;
  grade?: number | string | null;
}

/**
 * Payment details (enrollment-level)
 */
export interface Payment {
  status: PaymentStatus;
  actualAmount: number;
  currency: Currency;
  amountPaid: number;
  balance: number;
  transactionId?: string;
  provider: PaymentProvider;
  paidAt?: Date;
}

// Update course progress (lessons, percentage, etc.)
export function updateProgress(
  lp: LearningProgress,
  {
    completedLessons,
    lessonHistory,
    totalLessons
  }: {
    completedLessons: number;
    lessonHistory?: string[];
    totalLessons: number;
  }
): LearningProgress {
  const percentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return {
    ...lp,
    completedLessons,
    totalLessons,
    lessonHistory: lessonHistory ?? lp.lessonHistory,
    percentage,
    updatedAt: new Date(),
    completionDate: percentage >= 100 ? new Date() : lp.completionDate,
  };
}

// Issue/revoke certificate
export function updateCertification(
  lp: LearningProgress,
  {
    issued,
    certificateId
  }: {
    issued: boolean;
    certificateId?: string;
  }
): LearningProgress {
  return {
    ...lp,
    certification: {
      issued,
      issuedAt: issued ? new Date() : null,
      certificateId: issued ? certificateId : undefined,
    },
    updatedAt: new Date()
  };
}

// Update grade
export function updateGrade(
  lp: LearningProgress,
  grade: number | string | null
): LearningProgress {
  return {
    ...lp,
    grade,
    updatedAt: new Date()
  };
}

/**
 * Update Payment details (for Enrollment)
 */
export function updatePayment(enrollment: any, payment: Payment) {
  return {
    ...enrollment,
    payment,
    updatedAt: new Date()
  };
}

/**
 * Change Enrollment Status
 */
export function changeEnrollmentStatus(
  enrollment: any,
  status: EnrollmentStatus
) {
  return {
    ...enrollment,
    status,
    updatedAt: new Date()
  };
}