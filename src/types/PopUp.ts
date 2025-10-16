import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { PopUpCourseType } from "./general";

export interface PopUp {
    id: string;
    icon?: string;
    title: string;
    description: string;
    type: PopUpCourseType;
    ctaText: string;
    ctaLink: string;
    autoClose?: boolean;
    duration?: number;
    active: boolean;
    createdAt: FieldValue | Timestamp;
    updatedAt: FieldValue | Timestamp;
};
