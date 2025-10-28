export const CURRENCY = {
  INR: "INR", // Indian Rupee
  USD: "USD", // United States Dollar
  EUR: "EUR", // Euro
  GBP: "GBP", // Pound Sterling
} as const;
export type Currency = typeof CURRENCY[keyof typeof CURRENCY];
