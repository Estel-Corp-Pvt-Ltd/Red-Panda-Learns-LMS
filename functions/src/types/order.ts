import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { OrderStatus, Currency } from "./general";
import { AddressType, PaymentProvider } from "./general";
import { TransactionLineItem } from "./transaction";

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
};

export interface Order {
  orderId: string;
  userId: string;
  items: TransactionLineItem[];
  status: OrderStatus;
  amount: number;
  exchangeRate: number;
  originalAmount: number;
  completedAt?: Timestamp | FieldValue;
  promoCode: string;
  couponDiscount: number;
  provider: PaymentProvider;
  providerOrderId: string;
  currency: Currency;
  metadata?: Record<string, any>;
  billingAddress: Address;
  shippingAddress?: Address;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};
