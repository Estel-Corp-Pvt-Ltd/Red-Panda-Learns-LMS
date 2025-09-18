import { Currency, EnrolledProgramType, EnrollmentStatus, PaymentProvider, PaymentStatus, UserRole } from "./general";

export interface Enrollment {
    id: string;
    userId: string;
    targetId: string; // course or bundle id
    enrollmentDate: Date;
    status: EnrollmentStatus;
    role: UserRole;
    programType: EnrolledProgramType
    currentLessonId?: string; // last lesson the student was on
    progress: {
        completedLessons: number;
        totalLessons: number;
        percentage: number;
    };
    lastAccessed?: Date;
    completionDate?: Date;
    certificateIssued: boolean;
    grade?: number | string | null;
    payment: {
        status: PaymentStatus;
        actualAmount: number;
        currency: Currency;
        amountPaid: number;
        balance: number;
        transactionId?: string;
        provider: PaymentProvider;
        paidAt?: Date;
    }
};
