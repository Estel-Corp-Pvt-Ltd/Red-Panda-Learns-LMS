import { doc, getDoc, serverTimestamp, updateDoc , Timestamp, FieldValue } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { EnrollmentStatus, PaymentStatus, PaymentProvider, Currency } from "./general";

/**
 * Learning progress interface
 */
export interface LearningProgress {
  id?: string;
  courseId?: string;
  currentLessonId?: string | null;
  lastAccessed?: Timestamp | FieldValue ;

  completedLessons: number;
  lessonHistory: string[];
  totalLessons: number;
  percentage: number;

  certification: {
    issued: boolean;
    issuedAt?: Timestamp | FieldValue ;
    certificateId?: string;
  };

  completionDate?: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue ;
  grade?: number | string | null;
}

/**
 * Enrollment payment details
 */
export interface EnrollmentPaymentDetails {
  status: PaymentStatus;
  actualAmount: number;
  currency: Currency;
  amountPaid: number;
  balance: number;
  transactionId?: string;
  provider: PaymentProvider;
  paidAt?: Timestamp | FieldValue;
}

/**
 * Update course progress
 */
export async function updateProgress(
  progressId: string,
  lessonId?: string,  
  additionalUpdates: Partial<LearningProgress> = {} 
): Promise<{ id: string; updatedAt: Timestamp | FieldValue  }> {
  const docRef = doc(db, "LearningProgress", progressId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) throw new Error("Progress not found");

  const data = snapshot.data() as LearningProgress;
  const updatedAt = serverTimestamp();

  let updatedData: Partial<LearningProgress> = {
    ...(data || {}), // keep existing fields
    ...additionalUpdates, // allow caller to pass extra optional fields
    updatedAt,
  };

  
  if (lessonId) {
    const completed = (data.completedLessons ?? 0) + 1;
    const total = data.totalLessons ?? 0;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    updatedData = {
      ...updatedData,
      completedLessons: completed,
      lessonHistory: [...(data.lessonHistory ?? []), lessonId],
      percentage,
        completionDate: completed >= total
    ? serverTimestamp() // ✅ Firestore server-side timestamp
    : data.completionDate ?? null,
  updatedAt: serverTimestamp(), 
    };
  }

  await updateDoc(docRef, updatedData);

  return { id: progressId, updatedAt };
}

/**
 * Update certification
 */
export async function updateCertification(
  progressId: string,
  issued: boolean,
  certificateId?: string
): Promise<{ id: string; updatedAt: Timestamp | FieldValue  }> {
  const docRef = doc(db, "LearningProgress", progressId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) throw new Error("Progress not found");

  const original = snapshot.data();
  const updatedAt = serverTimestamp();

  // Merge original certification with new updates
  const newCertification = {
    ...(original.certification || {}), // keep existing fields
    issued,
    issuedAt: issued ? updatedAt : null,
    certificateId: certificateId ?? (original.certification?.certificateId || null),
  };

  await updateDoc(docRef, {
    certification: newCertification,
    updatedAt,
  });

  return { id: progressId, updatedAt };
}

/**
 * Update grade
 */
export async function updateGrade(
  progressId: string,
  grade: number | string | null
): Promise<{ id: string; grade: number | string | null; updatedAt: Timestamp | FieldValue  }> {
  const docRef = doc(db, "learningProgress", progressId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) throw new Error("Progress not found");

  const original = snapshot.data();
  const updatedAt = serverTimestamp();

  // Preserve old data, update only grade + updatedAt
  const updatedData = {
    ...(original || {}),
    grade,
    updatedAt,
  };

  await updateDoc(docRef, updatedData);

  return { id: progressId, grade, updatedAt };
}

/**
 * Update payment
 */
export async function updatePayment(
  enrollmentId: string,
  paymentId: string,
  payment: Partial<EnrollmentPaymentDetails>
): Promise<{ id: string; updatedAt: Timestamp | FieldValue  }> {
  const docRef = doc(db, "Enrollments", enrollmentId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) throw new Error("Enrollment not found");

  const original = snapshot.data();
  const updatedAt = serverTimestamp();

  // 🔑 Merge old payment data with the new updates
  const updatedPayment: EnrollmentPaymentDetails = {
    ...(original.payment || {}),
    ...payment,
    transactionId: paymentId, 
  };

  await updateDoc(docRef, {
    payment: updatedPayment,
    updatedAt,
  });

  return { id: enrollmentId, updatedAt };
}

/**
 * Change enrollment status
 */
export async function changeEnrollmentStatus(
  enrollmentId: string,
  status: EnrollmentStatus
): Promise<{ id: string; updatedAt: Timestamp | FieldValue }> {
  const docRef = doc(db, "enrollments", enrollmentId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) throw new Error("Enrollment not found");

  const updatedAt = serverTimestamp();
  await updateDoc(docRef, { status, updatedAt });

  return { id: enrollmentId, updatedAt };
}