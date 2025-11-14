export interface InvoiceItem {
  description: string;
  hsnSac: string;
  quantity: number;
  rate: number;
  gstPercentage: number;
  gstAmount: number;
  amount: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface CompanyInfo {
  name: string;
  address: Address;
  gstin: string;
  phone: string;
  email: string;
  website: string;
}

export interface CustomerInfo {
  name: string;
  address: Address;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  terms?: string;
  dueDate?: string;
  billTo: CustomerInfo;
  shipTo: CustomerInfo | null;
  items: InvoiceItem[];
  subtotal: number;
  totalTax: number;
  total: number;
  currency: string;
  paymentMade: number;
  balanceDue: number;
  note?: string;
}
