import { EnrolledProgramType, UserRole, UserStatus } from "./general";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { OrganizationType } from './general';


export interface User {
    id: string;
    email: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    enrollments: Array<{ targetId: string, targetType: EnrolledProgramType }>;
    organizationId?: string;
     organizationType: OrganizationType;
    photoURL?: string;
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
};
