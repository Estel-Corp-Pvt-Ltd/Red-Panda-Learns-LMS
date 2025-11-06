import { CURRENCY } from "./types";
import { z } from "zod";

export const validateAmount = (amount: any): number => {
  if (typeof amount !== "number" || isNaN(amount)) {
    throw new Error("Invalid amount: must be a number");
  }

  if (amount <= 0) {
    throw new Error("Invalid amount: must be a positive integer");
  }

  if (amount >= 100000000) {
    throw new Error("Invalid amount: exceeds maximum allowed");
  }

  if (!Number.isInteger(amount)) {
    throw new Error("Invalid amount: must be an integer");
  }

  return amount;
}

export const validateCurrency = (currency: any): string => {
  const allowed = Object.values(CURRENCY);
  if (!allowed.includes(currency)) throw new Error("Invalid currency");
  return currency;
}

export const AddressSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().optional(),
  landmark: z.string().optional(),
  type: z.enum(["BILLING", "SHIPPING"]),
});

export const ItemSchema = z.object({
  itemId: z.string().min(1, "Reference ID is required"),
  itemType: z.enum(["COURSE", "BUNDLE"]),
});

export type OrderItem = z.infer<typeof ItemSchema>;

export const PaymentRequestSchema = z.object({
  provider: z.enum(["RAZORPAY", "PAYPAL"]),
  items: z.array(ItemSchema).min(1, "At least one item is required").max(10),
  selectedCurrency: z.enum(["USD", "INR"]),
  billingAddress: AddressSchema,
  promoCode: z.string().optional(),
});

export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;
