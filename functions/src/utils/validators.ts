import { CURRENCY } from "./types";

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
