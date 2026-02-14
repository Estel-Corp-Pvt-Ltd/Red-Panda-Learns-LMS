import { FieldValue, Timestamp } from "firebase/firestore";
import { PlatformType, UserRole, UserStatus } from "./general";

export interface FcmToken {
  token: string;
  platform: PlatformType;
  updatedAt: Timestamp | FieldValue;
}
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
  class?: string;
  division?: string;
  photoURL?: string;
  fcmTokens?: FcmToken[];
  readAt: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}
