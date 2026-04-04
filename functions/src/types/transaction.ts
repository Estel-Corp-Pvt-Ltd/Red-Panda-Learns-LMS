import { FieldValue, Timestamp } from "firebase/firestore";
import {
  PaymentProvider,
  RazorpayWebhookEvent,
  TransactionStatus,
  TransactionType,
  EnrolledProgramType
} from "./general";

// TODO: Store a replica for each event
export type WebhookEvent = {
  eventId: string;   // provider’s webhook ID
  type: RazorpayWebhookEvent;
  payload: any;      // raw JSON body
  receivedAt: Date | string;
};

export type ProviderTimestamp = {
  raw: string | number; // the exact value from provider
  asDate: Date;         // normalized for easy usage
};

export type RazorpayPaymentDetails = {
  orderId: string;
  paymentId?: string;
  signature?: string;
  method?: string;
  bank?: string;
  vpa?: string;
  acquirerData?: any;
  wallet?: string;
  timestamp?: ProviderTimestamp;
};

export type PaymentDetails = RazorpayPaymentDetails;

export interface TransactionLineItem {
  itemId: string;            // The actual courseId or bundleId
  itemType: EnrolledProgramType; // Helps you know which DB collection to look up later
  name: string;              // Snapshot of the name at time of purchase (optional but useful)
  amount: number;            // The price sold specifically for this item (after any item-specific discounts)
  originalAmount?: number;   // The price before discounts (optional)
};

export interface Transaction {
  id: string; // internal transaction ID (UUID)
  orderId: string;
  userId: string;
  type: TransactionType;
  amount: number; // final charged amount
  currency: string;
  paymentProvider: PaymentProvider;
  status: TransactionStatus;
  paymentDetails: PaymentDetails | {};
  notes?: string[];
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};

export type CurrencyRate = {
  id: string;               // UUID or auto-increment
  baseCurrency: string;     // e.g. "USD"
  targetCurrency: string;   // e.g. "INR"
  rate: number;             // average or closing rate for the day
  date: string;             // YYYY-MM-DD (represents the snapshot day)
  source: string;           // e.g. "ECB", "Fixer.io", "CurrencyLayer"
  createdAt: Timestamp | FieldValue; // when this snapshot was stored
};
