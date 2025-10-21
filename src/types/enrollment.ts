import { FieldValue, Timestamp } from "firebase/firestore";

import { LearningProgress } from "./learning-progress";
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
    targetId: string;                // courseId OR bundleId
    targetType: EnrolledProgramType;
    enrollmentDate: Timestamp | FieldValue;
    status: EnrollmentStatus;
    role: UserRole;

    // Always track main progress (for course = course’s progress, for bundle = overall aggregate)
    progressId: string;
    progressSummary?: {
        completedLessons: number;
        totalLessons: number;
        percent: number;
    };
    bundleProgress?: Array<{ courseId: string; progressId: string; }>;

    pricingModel: PricingModel;
    payment?: {
        status: PaymentStatus;
        actualAmount: number;
        currency: Currency;
        amountPaid: number;
        balance: number;
        transactionId?: string;
        provider: PaymentProvider;
        paidAt?: Timestamp | FieldValue;
    };
};
