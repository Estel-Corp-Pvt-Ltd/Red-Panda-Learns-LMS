import { FieldValue, Timestamp } from "firebase/firestore";
import { UserRole, UserStatus } from "./general";

export interface User {
    id: string;
    username?: string;
    email: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    organizationId?: string;
    photoURL?: string;
    readAt:Timestamp | FieldValue;
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
};
