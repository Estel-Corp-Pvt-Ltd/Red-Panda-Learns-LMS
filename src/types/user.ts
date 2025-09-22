import { UserRole, UserStatus } from "./general";

export interface User {
    id: string;
    email: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    enrollments: String[];
    organizationId?: string;
    photoURL?: string;
    createdAt: Date;
    updatedAt: Date;
};
