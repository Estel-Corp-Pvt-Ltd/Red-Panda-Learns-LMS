import { Timestamp, FieldValue } from "firebase/firestore";
import { parseISO, isValid } from "date-fns";
import { Duration } from "@/types/general";

/**
 * Safely convert values (Date | Firestore Timestamp | ISO string | null) → JS Date | null
 */
/**
 * Normalize Timestamp / Date / ISO string / null → safe Date
 */
export const toDateSafe = (
  val: Date | Timestamp | FieldValue | string | null | undefined | any
): Date | null => {
  if (!val) return null;

  // Native Date
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  // Firestore Timestamp
  if (val instanceof Timestamp) {
    return val.toDate();
  }

  // Serialized Firestore Timestamp
  if (
    typeof val === "object" &&
    (("_seconds" in val && "_nanoseconds" in val) || ("seconds" in val && "nanoseconds" in val))
  ) {
    const seconds = val._seconds ?? val.seconds;
    return new Date(seconds * 1000);
  }

  // Numeric timestamp (milliseconds or seconds)
  if (typeof val === "number") {
    // If the number looks like seconds (< year 2100 in ms ≈ 4.1e12), treat as seconds
    const ms = val > 1e12 ? val : val * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO string
  if (typeof val === "string") {
    const d = parseISO(val);
    return isValid(d) ? d : null;
  }

  // FieldValue (serverTimestamp placeholder)
  return null;
};

/**
 * Format a date to a localized string
 */
export const formatDate = (
  val: Date | Timestamp | FieldValue | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = toDateSafe(val);
  if (!date) return "—";

  return new Intl.DateTimeFormat(
    undefined,
    options ?? {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ).format(date);
};

/**
 * Format a date to a localized string including time
 */
export const formatDateTime = (
  val: Date | Timestamp | FieldValue | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = toDateSafe(val);
  if (!date) return "—";

  return new Intl.DateTimeFormat(
    undefined,
    options ?? {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
};

/**
 * Format only time
 */
export const formatTime = (
  val: Date | Timestamp | FieldValue | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = toDateSafe(val);
  if (!date) return "—";

  return new Intl.DateTimeFormat(
    undefined,
    options ?? {
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
};

/**
 * Parses a duration in seconds into hours and minutes.
 * @param durationInSeconds The total duration in seconds.
 * @returns An object containing the calculated hours and minutes.
 */
export const parseDuration = (durationInSeconds: number): { hours: number; minutes: number } => {
  if (typeof durationInSeconds !== "number" || durationInSeconds < 0) {
    return { hours: 0, minutes: 0 };
  }

  const totalMinutes = Math.floor(durationInSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return { hours, minutes };
};

type DateInput = Date | Timestamp | FieldValue;

/**
 * Compares two dates (either native Date objects or Firebase Timestamps)
 * to determine which one is chronologically greater (more recent).
 * @param dateA The first date to compare.
 * @param dateB The second date to compare.
 * @returns 1 if dateA is greater (more recent), -1 if dateB is greater, 0 if they are equal.
 */
export function compareDates(dateA: DateInput, dateB: DateInput): 1 | -1 | 0 {
  // Helper function to get the numeric timestamp in milliseconds
  const getMs = (date: DateInput): number => {
    if (date instanceof Date) {
      // For native JavaScript Date objects
      return date.getTime();
    } else if (date instanceof Timestamp) {
      // For Firebase Timestamp objects
      return date.toMillis();
    }
    // Fallback for potentially null/undefined or unexpected inputs
    return 0;
  };

  const msA = getMs(dateA);
  const msB = getMs(dateB);

  if (msA > msB) {
    return 1; // dateA is more recent
  } else if (msA < msB) {
    return -1; // dateB is more recent
  } else {
    return 0; // The dates are equal
  }
}

/**
 * Converts a Firebase Timestamp or FieldValue to a native JavaScript Date.
 * Returns null for null/undefined or FieldValue (serverTimestamp) placeholders.
 * This function helps with TS compiler errors since we can use toDate() on Timestamp only but our date fields have the type Timestamp | FieldValue
 *
 * @param value - A Firestore Timestamp, FieldValue, or null/undefined.
 * @returns A native Date object, or null if conversion is not possible.
 */
export function convertToDate(value?: Timestamp | FieldValue | null): Date | null {
  if (!value) return null;

  if (value instanceof Timestamp) {
    return value.toDate(); // Firestore Timestamp → Date
  }

  // If it's FieldValue.serverTimestamp() or any other non-Timestamp, return null
  return null;
}

export const formatTimeDuration = (totalMinutes: number): string => {
  if (totalMinutes <= 0) return "0 min";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} min`);

  return parts.join(" ");
};
export const secondsToDuration = (videoDuration: number): Duration => {
  const hours = Math.floor(videoDuration / 3600);
  const minutes = Math.floor((videoDuration % 3600) / 60);

  return { hours, minutes };
};
export const timestampToLocalInput = (date: Date | null | undefined): string => {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const formatTimeRemaining = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

export function getYesterdayTimestamp(): Timestamp {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  return Timestamp.fromDate(yesterday);
}
