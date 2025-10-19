import { FieldValue, Timestamp } from "firebase/firestore";

import { LearningProgress } from "./learningProgress";
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
    targetType: EnrolledProgramType; // "course" or "bundle"
    enrollmentDate: Timestamp | FieldValue;
    status: EnrollmentStatus;
    role: UserRole;

    bundleProgress?: Array<{ courseId: string; progressId: string; }>;

    // Always track main progress (for course = course’s progress, for bundle = overall aggregate)
    progress: LearningProgress;

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
}