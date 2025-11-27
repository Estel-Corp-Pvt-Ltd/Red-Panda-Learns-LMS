import { FieldValue, Timestamp } from "firebase/firestore";
import { ComplaintActionType, ComplaintCategory, ComplaintSeverity, ComplaintStatus } from "./general";

export interface Complaint {
    id: string;
    userId: string;
    category: ComplaintCategory;
    description: string;
    imageUrls?: string[]; // max length = 4
    status: ComplaintStatus;
    severity: ComplaintSeverity;
    relatedEntityId?: string;
    assignedTo?: string;
    resolutionSummary?: string;
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
};

export interface ComplaintAction {
    id: string;
    complaintId: string;
    actionBy: string;
    actionType: ComplaintActionType;
    comment?: string;
    createdAt: Timestamp | FieldValue;
    isInternal: boolean; // true -> visible to only admins, false -> visible to users as well
};
