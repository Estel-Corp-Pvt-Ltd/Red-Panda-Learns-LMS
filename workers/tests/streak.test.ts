import { describe, expect, it } from "vitest";
import { computeStreak, dayKey } from "../src/lib/streak";

// Anchor instant: 2026-07-02T06:00:00Z → 11:30 IST, same calendar day either way.
const T = Date.parse("2026-07-02T06:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

describe("computeStreak", () => {
  it("starts a streak from nothing", () => {
    expect(computeStreak(null, T)).toEqual({ current: 1, longest: 1, lastActiveDate: dayKey(T) });
  });

  it("is idempotent within the same day", () => {
    const s1 = computeStreak(null, T);
    expect(computeStreak(s1, T + 3600_000)).toBe(s1);
  });

  it("increments on consecutive days", () => {
    const s1 = computeStreak(null, T);
    const s2 = computeStreak(s1, T + DAY);
    expect(s2.current).toBe(2);
    expect(s2.longest).toBe(2);
  });

  it("resets after a missed day but keeps longest", () => {
    let s = computeStreak(null, T);
    s = computeStreak(s, T + DAY); // current 2
    s = computeStreak(s, T + 3 * DAY); // skipped a day
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });
});
