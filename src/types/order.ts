import { FieldValue,Timestamp } from "firebase-admin/firestore";
import { OrderStatus,Currency } from "./general";
import { AddressType } from "./general";


export interface Address {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  landmark?: string;
  type: AddressType; 
}

export interface Order {
   orderId: string;                        
  userId: string;                        
  courseIds: string[];                    
  bundleId?: string | null;               
  status: OrderStatus;                   
  amount: number;                        
  createdAt: Timestamp | FieldValue;      
  completedAt?: Timestamp | FieldValue;   
  transactionId?: string | null;          
  currency: Currency;         
  metadata?: Record<string, any>;         // Flexible key-value store for extra info                 
  billingAddress:Address;
  shippingAddress?:Address;
}
