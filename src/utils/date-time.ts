import { Timestamp, FieldValue } from "firebase/firestore";

/**
 * Convert Firestore Timestamp / FieldValue / Date / null → JS Date | null
 */
export const toDateSafe = (
  val: Date | Timestamp | FieldValue | string | number | null | undefined
): Date | null => {
  if (!val) return null;

  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  // For FieldValue sentinels (like serverTimestamp())
  return null;
};

/**
 * Format a date to a localized string
 */
export const formatDate = (
  val: Date | Timestamp | FieldValue | string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = toDateSafe(val);
  if (!date) return "—";

  return new Intl.DateTimeFormat(undefined, options ?? {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};
/**
 * Format a date to a localized string including time
 */
export const formatDateTime = (val: any, options?: Intl.DateTimeFormatOptions): string => {
  const date = toDateSafe(val);
  if (!date) return "—";

  return new Intl.DateTimeFormat(undefined, options ?? {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Format only time
 */
export const formatTime = (val: any, options?: Intl.DateTimeFormatOptions): string => {
  const date = toDateSafe(val);
  if (!date) return "—";

  return new Intl.DateTimeFormat(undefined, options ?? {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
