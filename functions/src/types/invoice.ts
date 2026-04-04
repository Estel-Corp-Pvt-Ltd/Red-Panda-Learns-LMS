export interface InvoiceItem {
  description: string;
  hsnSac: string;
  quantity: number;
  rate: number;
  igstPercentage: number;
  igstAmount: number;
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
  company: CompanyInfo;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  terms: string;
  placeOfSupply: string;
  billTo: CustomerInfo;
  shipTo: CustomerInfo;
  items: InvoiceItem[];
  subtotal: number;
  totalTax: number;
  total: number;
  paymentMade: number;
  balanceDue: number;
  bankDetails: {
    bankName: string;
    branch: string;
    accountNumber: string;
    ifscCode: string;
  };
  totalInWords: string;
}
