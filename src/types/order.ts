import { FieldValue,Timestamp } from "firebase-admin/firestore";
import { OrderStatus,Currency } from "./general";

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
}
