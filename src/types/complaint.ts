import { Timestamp } from "firebase/firestore";
import {
  ComplaintActionType,
  ComplaintCategory,
  ComplaintSeverity,
  ComplaintStatus,
} from "./general";

export interface Complaint {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: ComplaintCategory;
  description: string;
  imageUrls?: string[]; // max length = 4
  status: ComplaintStatus;
  severity: ComplaintSeverity;
  relatedEntityId?: string;
  assignedTo?: string;
  resolutionSummary?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface ComplaintAction {
  id: string;
  complaintId: string;
  actionBy: string;
  actionType: ComplaintActionType;
  comment?: string;
  createdAt: Timestamp | Date;
  isInternal: boolean; // true -> visible to only admins, false -> visible to users as well
}
