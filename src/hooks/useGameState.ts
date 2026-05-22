import { useState, useEffect, useMemo } from "react";
import type { KarmaDaily } from "@/types/karma";
import type { Enrollment } from "@/types/enrollment";
import type { Timestamp } from "firebase/firestore";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  color: string;
  earnedDate: string | null;
  xpReward: number;
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  goal: number;
  completed: boolean;
}

export interface ActivityItem {
  id: string;
  type: "lesson" | "quiz" | "assignment" | "community" | "social";
  title: string;
  subtitle: string;
  xpEarned: number;
  timeAgo: string;
}

export interface GameState {
  xp: number;
  level: number;
  xpEarnedThisLevel: number;
  xpForNextLevel: number;
  streak: number;
  bestStreak: number;
  badgesEarned: number;
  weeklyXP: number;
  dailyQuests: DailyQuest[];
  achievements: Achievement[];
  recentActivity: ActivityItem[];
}

// ── Level thresholds (cumulative XP to reach level N) ─────────────────────────

const LEVEL_THRESHOLDS = [0, 50, 120, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200, 11000, 13000, 15500, 18500];

function calcLevelProgress(xp: number) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  level = Math.min(level, LEVEL_THRESHOLDS.length);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? currentThreshold + 2000;
  return {
    level,
    xpEarnedThisLevel: xp - currentThreshold,
    xpForNextLevel: nextThreshold - currentThreshold,
  };
}

// ── Streak from karma history ─────────────────────────────────────────────────

function tsToDateString(ts: Timestamp | unknown): string {
  try {
    if (ts && typeof ts === "object" && "toDate" in (ts as object)) {
      return (ts as Timestamp).toDate().toDateString();
    }
    return new Date(ts as string).toDateString();
  } catch {
    return "";
  }
}

function computeStreakFromHistory(entries: KarmaDaily[]): { streak: number; bestStreak: number } {
  if (!entries.length) return { streak: 0, bestStreak: 0 };

  // Collect unique activity dates
  const dateSet = new Set<string>();
  for (const e of entries) {
    const d = tsToDateString(e.date);
    if (d) dateSet.add(d);
  }

  // Also count today if stored locally (user may have earned karma today)
  const todayLogin = localStorage.getItem("rpl_last_login");
  if (todayLogin) dateSet.add(new Date(todayLogin).toDateString());
  // Mark today as visited
  localStorage.setItem("rpl_last_login", new Date().toDateString());

  // Compute current streak backwards from today
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (dateSet.has(d.toDateString())) {
      streak++;
    } else if (i === 0) {
      // Today has no karma yet — check if yesterday has (streak still active)
      continue;
    } else {
      break;
    }
  }

  // Best streak: stored locally and compared against current
  const stored = parseInt(localStorage.getItem("rpl_best_streak") ?? "0", 10);
  const bestStreak = Math.max(streak, stored);
  localStorage.setItem("rpl_best_streak", String(bestStreak));

  return { streak, bestStreak };
}

// ── Weekly XP ─────────────────────────────────────────────────────────────────

function computeWeeklyXP(entries: KarmaDaily[]): number {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return entries.reduce((sum, e) => {
    try {
      const d = tsToDateString(e.date);
      if (new Date(d) >= sevenDaysAgo) return sum + (e.karmaEarned ?? 0);
    } catch {}
    return sum;
  }, 0);
}

// ── Daily quests from today's karma breakdown ─────────────────────────────────

function buildDailyQuests(todayEntries: KarmaDaily[]): DailyQuest[] {
  // Aggregate today's breakdown totals
  const totals = { LEARNING: 0, QUIZ: 0, ASSIGNMENT: 0, COMMUNITY: 0, SOCIAL: 0 };
  for (const e of todayEntries) {
    if (e.breakdown) {
      totals.LEARNING += e.breakdown.LEARNING ?? 0;
      totals.QUIZ += e.breakdown.QUIZ ?? 0;
      totals.ASSIGNMENT += e.breakdown.ASSIGNMENT ?? 0;
      totals.COMMUNITY += e.breakdown.COMMUNITY ?? 0;
    }
    // Also count karmaEarned if breakdown unavailable
  }
  const totalToday = todayEntries.reduce((s, e) => s + (e.karmaEarned ?? 0), 0);

  return [
    {
      id: "earn_learning_xp",
      title: "Complete a Lesson",
      description: "Earn any learning karma today",
      xpReward: 20,
      progress: totals.LEARNING > 0 ? 1 : 0,
      goal: 1,
      completed: totals.LEARNING > 0,
    },
    {
      id: "ace_quiz",
      title: "Score in a Quiz",
      description: "Earn quiz karma today",
      xpReward: 25,
      progress: totals.QUIZ > 0 ? 1 : 0,
      goal: 1,
      completed: totals.QUIZ > 0,
    },
    {
      id: "earn_50_xp",
      title: "Earn 50 XP Today",
      description: "Keep learning!",
      xpReward: 15,
      progress: Math.min(totalToday, 50),
      goal: 50,
      completed: totalToday >= 50,
    },
  ];
}

// ── Achievements derived from real data ───────────────────────────────────────

function deriveAchievements(
  totalXP: number,
  streak: number,
  enrollments: Enrollment[],
  entries: KarmaDaily[]
): Achievement[] {
  const hasCompletedCourse = enrollments.some((e) => !!e.completionDate);
  const hasAnyQuizKarma = entries.some((e) => (e.breakdown?.QUIZ ?? 0) > 0);
  const totalEntries = entries.length;

  return [
    {
      id: "first_step",
      title: "First Step",
      description: "Enroll in your first course",
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      earnedDate: enrollments[0]?.enrollmentDate ? new Date(enrollments[0].enrollmentDate as any).toISOString() : null,
      xpReward: 20,
    },
    {
      id: "karma_starter",
      title: "Karma Starter",
      description: "Earn your first 50 XP",
      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      earnedDate: totalXP >= 50 ? new Date().toISOString() : null,
      xpReward: 30,
    },
    {
      id: "consistent_learner",
      title: "Consistent Learner",
      description: "Maintain a 7-day streak",
      color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      earnedDate: streak >= 7 ? new Date().toISOString() : null,
      xpReward: 100,
    },
    {
      id: "quiz_scorer",
      title: "Quiz Scorer",
      description: "Earn karma from a quiz",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      earnedDate: hasAnyQuizKarma ? new Date().toISOString() : null,
      xpReward: 50,
    },
    {
      id: "dedicated_learner",
      title: "Dedicated Learner",
      description: "Have 10+ active learning days",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      earnedDate: totalEntries >= 10 ? new Date().toISOString() : null,
      xpReward: 75,
    },
    {
      id: "course_completer",
      title: "Course Completer",
      description: "Complete a full course",
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      earnedDate: hasCompletedCourse ? new Date().toISOString() : null,
      xpReward: 200,
    },
    {
      id: "xp_champion",
      title: "XP Champion",
      description: "Earn 1,000 total XP",
      color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
      earnedDate: totalXP >= 1000 ? new Date().toISOString() : null,
      xpReward: 150,
    },
  ];
}

// ── Activity items from karma history ─────────────────────────────────────────

function buildActivity(entries: KarmaDaily[], enrollments: Enrollment[]): ActivityItem[] {
  // Map courseId → courseName
  const courseNameMap: Record<string, string> = {};
  for (const e of enrollments) courseNameMap[e.courseId] = e.courseName ?? "";

  const now = Date.now();

  function timeAgo(ts: unknown): string {
    try {
      let d: Date;
      if (ts && typeof ts === "object" && "toDate" in (ts as object)) {
        d = (ts as Timestamp).toDate();
      } else {
        d = new Date(ts as string);
      }
      const diff = now - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins} min ago`;
      const hours = Math.floor(diff / 3600000);
      if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
      const days = Math.floor(diff / 86400000);
      if (days === 1) return "Yesterday";
      return `${days} days ago`;
    } catch {
      return "";
    }
  }

  function typeFromBreakdown(e: KarmaDaily): ActivityItem["type"] {
    if (!e.breakdown) return "lesson";
    const b = e.breakdown;
    if ((b.QUIZ ?? 0) > 0) return "quiz";
    if ((b.ASSIGNMENT ?? 0) > 0) return "assignment";
    if ((b.COMMUNITY ?? 0) > 0) return "community";
    if ((b.SOCIAL ?? 0) > 0) return "social";
    return "lesson";
  }

  function labelFromType(type: ActivityItem["type"], karma: number, courseName: string): string {
    switch (type) {
      case "quiz": return `Completed a quiz`;
      case "assignment": return `Submitted an assignment`;
      case "community": return `Contributed to community`;
      case "social": return `Shared a certificate`;
      default: return `Earned ${karma} karma`;
    }
  }

  return entries.slice(0, 8).map((e, i) => {
    const type = typeFromBreakdown(e);
    const courseName = courseNameMap[e.courseId] ?? "Course";
    return {
      id: e.id ?? String(i),
      type,
      title: labelFromType(type, e.karmaEarned, courseName),
      subtitle: courseName,
      xpEarned: e.karmaEarned ?? 0,
      timeAgo: timeAgo(e.date),
    };
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseGameStateInput {
  karmaHistory: KarmaDaily[];
  todayKarmaEntries: KarmaDaily[];
  enrollments: Enrollment[];
  isLoading: boolean;
}

export function useGameState({
  karmaHistory,
  todayKarmaEntries,
  enrollments,
  isLoading,
}: UseGameStateInput): GameState {
  return useMemo<GameState>(() => {
    if (isLoading) {
      return {
        xp: 0, level: 1, xpEarnedThisLevel: 0, xpForNextLevel: 50,
        streak: 0, bestStreak: 0, badgesEarned: 0, weeklyXP: 0,
        dailyQuests: [], achievements: [], recentActivity: [],
      };
    }

    const allEntries = [...karmaHistory, ...todayKarmaEntries];
    const xp = allEntries.reduce((s, e) => s + (e.karmaEarned ?? 0), 0);
    const { level, xpEarnedThisLevel, xpForNextLevel } = calcLevelProgress(xp);
    const { streak, bestStreak } = computeStreakFromHistory(allEntries);
    const weeklyXP = computeWeeklyXP(allEntries);
    const achievements = deriveAchievements(xp, streak, enrollments, allEntries);
    const badgesEarned = achievements.filter((a) => a.earnedDate !== null).length;
    const dailyQuests = buildDailyQuests(todayKarmaEntries);
    const recentActivity = buildActivity(allEntries, enrollments);

    return {
      xp, level, xpEarnedThisLevel, xpForNextLevel,
      streak, bestStreak, badgesEarned, weeklyXP,
      dailyQuests, achievements, recentActivity,
    };
  }, [karmaHistory, todayKarmaEntries, enrollments, isLoading]);
}
