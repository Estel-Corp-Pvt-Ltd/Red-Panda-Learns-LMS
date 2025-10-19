import { Timestamp, FieldValue } from "firebase/firestore";
import { AttributeType } from "./general";

export interface Attribute {
  id: string;
  name: string;
  type: AttributeType;
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
};
