import { FieldValue, Timestamp } from "firebase/firestore";

import {
    EnrolledProgramType,
    EnrollmentStatus,
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
    progressId?: string;
    progressSummary?: {
        completedLessons?: number;
        completedCourses?: number;
        totalLessons?: number;
        totalCourses?: number;
        percent: number;
    };
    bundleProgress?: Array<{ courseId: string; progressId: string; }>;

    pricingModel: PricingModel;
    paymentSummary?: {
        transactions?: string[]; // only include transaction IDs where status === SUCCESS
        status: PaymentStatus;
        totalAmount: number;
        totalPaid: number;
        balance: number;
    };

    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
};
