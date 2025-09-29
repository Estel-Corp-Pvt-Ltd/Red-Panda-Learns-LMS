import { FieldValue, Timestamp } from "firebase/firestore";
import {
  Currency,
  PaymentProvider,
  PayPalWebhookEvent,
  RazorpayWebhookEvent,
  RefundInitiator,
  TransactionStatus,
  TransactionType
} from "./general";

// TODO: Store a replica for each event
export type WebhookEvent = {
  eventId: string;   // provider’s webhook ID
  type: RazorpayWebhookEvent | PayPalWebhookEvent;
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
  wallet?: string;
  timestamp?: ProviderTimestamp;
};

export type PayPalPaymentDetails = {
  orderId: string;
  payerId?: string;
  paymentId?: string;
  intent: string;
  status: string;
  timestamp?: ProviderTimestamp;
};

export type TransactionMetadata = {
  userEmail: string;
  courseTitle: string;
  userAgent?: string;
  paymentAttempts: number;
  reasonForRefund?: string;
  reasonForFailure?: string;
  refundInitiatedBy?: RefundInitiator;
  notes?: string[];
};

export type PaymentDetails = RazorpayPaymentDetails | PayPalPaymentDetails;

export interface Transaction {
  id: string; // internal transaction ID (UUID)
  orderNumber: number;
  userId: string;
  courseId: string;
  parentTransactionId?: string; // if refund, points to original payment
  type: TransactionType;

  amount: number; // final charged amount
  currency: Currency;
  originalAmount?: number; // in original currency
  originalCurrency?: Currency;
  exchangeRate?: number;

  paymentProvider: PaymentProvider;
  status: TransactionStatus;

  paymentDetails: PaymentDetails;

  metadata: TransactionMetadata;

  webhookEvents?: WebhookEvent[];

  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  completedAt?: Timestamp | FieldValue;
};

export type CurrencyRate = {
  id: string;               // UUID or auto-increment
  baseCurrency: string;     // e.g. "USD"
  targetCurrency: string;   // e.g. "INR"
  rate: number;             // average or closing rate for the day
  date: string;             // YYYY-MM-DD (represents the snapshot day)
  source: string;           // e.g. "ECB", "Fixer.io", "CurrencyLayer"
  createdAt: Date | string; // when this snapshot was stored
};
