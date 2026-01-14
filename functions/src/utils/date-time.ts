import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { parseISO, isValid } from "date-fns";
import { Duration } from "../types/general";

/**
 * Safely convert values (Date | Firestore Timestamp | ISO string | null) → JS Date | null
 */

/**
 * Normalize Timestamp / Date / ISO string / null → safe Date
 */
export const toDateSafe = (
  val: Date | Timestamp | FieldValue | string | null | undefined
): Date | null => {
  if (!val) return null;

  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  if (typeof val === "string") {
    // Only accept ISO‑8601 strings, reject “02/30/2024”-like formats
    const d = parseISO(val);
    return isValid(d) ? d : null;
  }

  // FieldValue or anything else → not a usable date
  return null;
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

export function durationToSeconds(duration: Duration): number {
  return duration.hours * 3600 + duration.minutes * 60;
}
