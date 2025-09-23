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
export interface EnrollmentPaymentDetails {
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
): { id?: string; updatedAt: Date } {
  const updatedAt = new Date();
  const completed = learningProgress.completedLessons + 1;
  const total = learningProgress.totalLessons;
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  const updated: LearningProgress = {
    ...learningProgress,
    completedLessons: completed,
    lessonHistory: [...learningProgress.lessonHistory, lessonId],
    percentage,
    updatedAt,
    completionDate: completed >= total ? updatedAt : learningProgress.completionDate,
  };

  return { id: updated.id, updatedAt };
}

/**
 *  certificate
 */
export function updateCertification(
  learningProgress: LearningProgress,
  issued: boolean,
  certificateId?: string
): { id?: string; updatedAt: Date } {
  const updatedAt = new Date();

  const updated: LearningProgress = {
    ...learningProgress,
    certification: {
      issued,
      issuedAt: issued ? updatedAt : null,
      certificateId,
    },
    updatedAt,
  };

  return { id: updated.id, updatedAt };
}

/**
 *  Update grade
 */
export function updateGrade(
  progressId: string,
  grade: number | string | null
): { id: string; grade: number | string | null; updatedAt: Date } {
  return {
    id: progressId,
    grade,
    updatedAt: new Date(),
  };
}

/**
 *  Update Payment details (enrollment-level)
 */
/**
 */
export function updatePayment(
  enrollmentId: string,
  paymentId: string,
  payment: EnrollmentPaymentDetails
): { id: string; payment: EnrollmentPaymentDetails; updatedAt: Date } {
  return {
    id: enrollmentId,
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