import { OrganizationType } from "@/types/general";
import { FieldValue, Timestamp } from "firebase/firestore";

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  classes: string[];
  divisions: string[];
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}
