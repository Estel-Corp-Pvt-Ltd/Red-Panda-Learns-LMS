import { EnrolledProgramType, UserRole, UserStatus } from "./general";
import { FieldValue, Timestamp } from "firebase/firestore";

export interface User {
    id: string;
    username?: string;
    email: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    enrollments: Array<{ targetId: string, targetType: EnrolledProgramType }>;
    organizationId?: string;
    photoURL?: string;
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
};
