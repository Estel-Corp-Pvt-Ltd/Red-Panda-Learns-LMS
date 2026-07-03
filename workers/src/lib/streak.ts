/**
 * streak.ts — Streak computation + storage.
 *
 * A streak counts consecutive calendar days on which the user completed at
 * least one lesson / quiz / assignment. It is updated ONLY server-side (from
 * the auth-verified /completeLesson handler) and stored in a client-read-only
 * collection, so it cannot be manipulated from the browser.
 *
 * ── To change how streaks are computed, edit `computeStreak` (and the
 *    timezone constant). Nothing else in the codebase needs to change. ──
 */
import { Firestore, SERVER_TIMESTAMP } from "./firestore";
import { COLLECTION } from "../constants";

// Streaks roll over at local midnight in this timezone (IST — no DST).
// ponytail: fixed offset. If you move to a DST timezone, compute `yesterday`
// by decrementing the calendar date instead of subtracting 24h.
const STREAK_UTC_OFFSET_MINUTES = 5 * 60 + 30; // Asia/Kolkata

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StreakState {
  current: number;
  longest: number;
  lastActiveDate: string | null; // "YYYY-MM-DD" in the streak timezone
}

/** "YYYY-MM-DD" for an epoch-ms instant, in the streak timezone. */
export function dayKey(epochMs: number): string {
  return new Date(epochMs + STREAK_UTC_OFFSET_MINUTES * 60_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Pure streak policy: given the previous state and "now", return the new
 * state after one completion event. Idempotent within a day.
 *
 * THIS is the function to change when the streak rule changes.
 */
export function computeStreak(prev: StreakState | null, epochMs: number): StreakState {
  const today = dayKey(epochMs);
  const yesterday = dayKey(epochMs - DAY_MS);

  if (!prev || !prev.lastActiveDate) {
    return { current: 1, longest: 1, lastActiveDate: today };
  }
  if (prev.lastActiveDate === today) {
    return prev; // already counted today
  }
  const current = prev.lastActiveDate === yesterday ? prev.current + 1 : 1;
  return {
    current,
    longest: Math.max(prev.longest ?? 0, current),
    lastActiveDate: today,
  };
}

function readState(doc: Record<string, unknown> | null): StreakState | null {
  if (!doc || !doc.lastActiveDate) return null;
  return {
    current: (doc.current as number) ?? 0,
    longest: (doc.longest as number) ?? 0,
    lastActiveDate: doc.lastActiveDate as string,
  };
}

/** Record a completion for `userId` and persist the updated streak. */
export async function updateUserStreak(
  fs: Firestore,
  userId: string,
  epochMs: number
): Promise<StreakState> {
  const prev = readState(await fs.getDoc(COLLECTION.STREAKS, userId));
  const next = computeStreak(prev, epochMs);

  // No-op on same-day repeat completions.
  if (prev && next.lastActiveDate === prev.lastActiveDate && next.current === prev.current) {
    return next;
  }

  await fs.setDoc(COLLECTION.STREAKS, userId, {
    userId,
    current: next.current,
    longest: next.longest,
    lastActiveDate: next.lastActiveDate,
    updatedAt: SERVER_TIMESTAMP,
  });
  return next;
}

/**
 * Read the user's streak for display. Reports `current: 0` when the streak has
 * lapsed (no completion today or yesterday) without mutating storage — the
 * stored value is only reset on the next completion.
 */
export async function getUserStreak(fs: Firestore, userId: string): Promise<StreakState> {
  const state = readState(await fs.getDoc(COLLECTION.STREAKS, userId));
  if (!state) return { current: 0, longest: 0, lastActiveDate: null };

  const now = Date.now();
  const alive = state.lastActiveDate === dayKey(now) || state.lastActiveDate === dayKey(now - DAY_MS);
  return { current: alive ? state.current : 0, longest: state.longest, lastActiveDate: state.lastActiveDate };
}
