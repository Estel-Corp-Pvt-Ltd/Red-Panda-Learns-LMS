import { ATTRIBUTE_TYPE } from "@/constants";
import { Timestamp } from "firebase/firestore";

export interface Attribute {
  id: string;
  name: string;
  type: ATTRIBUTE_TYPE;
  createdAt: Timestamp;            
  updatedAt?: Timestamp;           
}
