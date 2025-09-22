import {
    Currency,
    EnrolledProgramType,
    EnrollmentStatus,
    PaymentProvider,
    PaymentStatus,
    PricingModel,
    UserRole
} from "./general";

export interface Enrollment {
    id: string;
    userId: string;
    targetId: string; // course or bundle id
    targetType: EnrolledProgramType;
    enrollmentDate: Date;
    status: EnrollmentStatus;
    role: UserRole;
    bundleCourseIds?: string[];
    currentLessonId?: string; // last lesson the student was on
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
    }
};
