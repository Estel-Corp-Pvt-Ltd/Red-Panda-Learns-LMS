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
export interface LearningPayment {
  status: PaymentStatus;
  actualAmount: number;
  currency: Currency;
  amountPaid: number;
  balance: number;
  transactionId?: string;
  provider: PaymentProvider;
  paidAt?: Date;
}

/**
 *  Update course progress
 * Adds in new lessons, recalculates percentage and completion date
 */
export function updateProgress(
  learningProgress: LearningProgress,
  lessonId: string
): LearningProgress {
  const completed = learningProgress.completedLessons + 1;
  const total = learningProgress.totalLessons;
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return {
    ...learningProgress,
    completedLessons: completed,
    lessonHistory: [...learningProgress.lessonHistory, lessonId],
    percentage,
    updatedAt: new Date(),
    completionDate: completed >= total ? new Date() : learningProgress.completionDate,
  };
}

/**
 * ✅ Issue or revoke certificate
 */
export function updateCertification(
  learningProgress: LearningProgress,
  issued: boolean,
  certificateId?: string
): LearningProgress {
  return {
    ...learningProgress,
    certification: {
      issued,
      issuedAt: issued ? new Date() : null,
      certificateId,
    },
    updatedAt: new Date(),
  };
}

/**
 *  Update grade
 */
export function updateGrade(
  learningProgress: LearningProgress,
  grade: number | string | null
): LearningProgress {
  return { ...learningProgress, grade, updatedAt: new Date() };
}

/**
 *  Update Payment details (enrollment-level)
 */
/**
 */
export function updatePayment(
  enrollment: any,
  paymentId: string,
  payment: LearningPayment
): any {
  const existingPayment = enrollment.payment;

  // If there is an existing payment and same id → update it
  if (existingPayment && existingPayment.transactionId === paymentId) {
    return {
      ...enrollment,
      payment: { ...existingPayment, ...payment, transactionId: paymentId },
      updatedAt: new Date(),
    };
  }

  // Otherwise set new payment with given id
  return {
    ...enrollment,
    payment: { ...payment, transactionId: paymentId },
    updatedAt: new Date(),
  };
}

/**
 *  Change Enrollment Status
 */
export function changeEnrollmentStatus(
  enrollment: any,
  status: EnrollmentStatus
): any {
  return {
    ...enrollment,
    status,
    updatedAt: new Date(),
  };
}