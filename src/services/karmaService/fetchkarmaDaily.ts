import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { COLLECTION } from "@/constants";
import { KarmaDaily } from "@/types/karma";
import { Result, ok, fail } from "@/utils/response";
import { logError } from "@/utils/logger";
import { getYesterdayTimestamp } from "@/utils/date-time";
import { PaginationOptions } from "@/utils/pagination";

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalKarma: number;
  rank: number;
  lastActiveDate?: Date;
}

export interface LeaderboardPaginationOptions {
  limit?: number;
  pageDirection?: "next" | "previous";
  cursor?: number | null; // Using number for rank-based pagination
}

interface LeaderboardResult {
  currentUser: LeaderboardEntry | null;
  leaderboard: LeaderboardEntry[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: number | null; // Using rank as cursor
  previousCursor: number | null;
  totalCount: number;
}
class fetchDailyKarma {
  async getUserKarmaHistory(userId: string, courseId?: string): Promise<Result<KarmaDaily[]>> {
    try {
      if (!userId) {
        return fail("Missing userId");
      }

      const yesterdayTs = getYesterdayTimestamp();

      const constraints = [
        where("userId", "==", userId),
        where("date", "<=", yesterdayTs),
        orderBy("date", "desc"),
      ];

      if (courseId) {
        constraints.splice(1, 0, where("courseId", "==", courseId));
      }

      const karmaQuery = query(collection(db, COLLECTION.KARMA_DAILY), ...constraints);
      const snapshot = await getDocs(karmaQuery);
      if (snapshot.empty) {
        return ok([]);
      }

      const karmaList: KarmaDaily[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as KarmaDaily),
      }));
      return ok(karmaList);
    } catch (error: any) {
      logError("KarmaDailyService.getUserKarmaHistory", error);
      return fail("Failed to fetch karma history.", error.code || error.message);
    }
  }
  /**
   * Get course leaderboard with the current user always shown first (if provided)
   * @param courseId - The course ID to filter by
   * @param currentUserId - (Optional) The current user's ID to always show. Can be null/empty to just view leaderboard
   * @param options - Pagination options
   */
  async getCourseLeaderboard(
    courseId: string,
    currentUserId: string | null | undefined,
    options: LeaderboardPaginationOptions = {}
  ): Promise<Result<LeaderboardResult>> {
    try {
      if (!courseId) {
        return fail("Missing courseId");
      }

      const { limit: itemsPerPage = 15, pageDirection = "next", cursor = null } = options;

      const today = getYesterdayTimestamp();

      // Step 1: Get all karma records for the course
      const allKarmaQuery = query(
        collection(db, COLLECTION.KARMA_DAILY),
        where("courseId", "==", courseId),
        where("date", "<=", today)
      );

      const allKarmaSnapshot = await getDocs(allKarmaQuery);

      // Aggregate karma by user
      const userKarmaMap = new Map<
        string,
        {
          totalKarma: number;
          userName: string;
          lastActiveDate: Date | null;
        }
      >();

      allKarmaSnapshot.docs.forEach((doc) => {
        const data = doc.data() as KarmaDaily;
        const existing = userKarmaMap.get(data.userId);

        // Convert Firestore Timestamp to Date
        const recordDate = data.date instanceof Timestamp ? data.date.toDate() : null;

        if (existing) {
          userKarmaMap.set(data.userId, {
            totalKarma: existing.totalKarma + (data.karmaEarned || 0),
            userName: data.userName || existing.userName,
            lastActiveDate:
              recordDate && existing.lastActiveDate
                ? recordDate > existing.lastActiveDate
                  ? recordDate
                  : existing.lastActiveDate
                : recordDate || existing.lastActiveDate,
          });
        } else {
          userKarmaMap.set(data.userId, {
            totalKarma: data.karmaEarned || 0,
            userName: data.userName || "Unknown User",
            lastActiveDate: recordDate,
          });
        }
      });

      // Convert to array and sort by karma (descending)
      const sortedUsers = Array.from(userKarmaMap.entries())
        .map(([userId, data]) => ({
          userId,
          userName: data.userName,
          totalKarma: data.totalKarma,
          lastActiveDate: data.lastActiveDate,
        }))
        .sort((a, b) => {
          // Primary sort: by karma (descending)
          if (b.totalKarma !== a.totalKarma) {
            return b.totalKarma - a.totalKarma;
          }
          // Secondary sort: by last active date (most recent first)
          if (a.lastActiveDate && b.lastActiveDate) {
            return b.lastActiveDate.getTime() - a.lastActiveDate.getTime();
          }
          return 0;
        });

      // Assign ranks
      const rankedUsers: LeaderboardEntry[] = sortedUsers.map((user, index) => ({
        userId: user.userId,
        userName: user.userName,
        totalKarma: user.totalKarma,
        rank: index + 1,
        lastActiveDate: user.lastActiveDate || undefined,
      }));

      // Step 2: Find current user's rank (only if currentUserId is provided)
      let currentUserEntry: LeaderboardEntry | null = null;

      if (currentUserId && currentUserId.trim()) {
        currentUserEntry = rankedUsers.find((user) => user.userId === currentUserId);

        // If user has no karma in this course, create a default entry
        if (!currentUserEntry) {
          currentUserEntry = {
            userId: currentUserId,
            userName: "You",
            totalKarma: 0,
            rank: rankedUsers.length + 1,
          };
        }
      }

      // Step 3: Handle pagination
      let paginatedUsers: LeaderboardEntry[] = [];
      let hasNextPage = false;
      let hasPreviousPage = false;
      let nextCursor: number | null = null;
      let previousCursor: number | null = null;

      if (pageDirection === "next") {
        const startIndex = typeof cursor === "number" ? cursor : 0;
        const endIndex = startIndex + itemsPerPage;

        paginatedUsers = rankedUsers.slice(startIndex, endIndex);
        hasNextPage = endIndex < rankedUsers.length;
        hasPreviousPage = startIndex > 0;

        if (hasNextPage) {
          nextCursor = endIndex;
        }
        if (hasPreviousPage) {
          previousCursor = Math.max(0, startIndex - itemsPerPage);
        }
      } else if (pageDirection === "previous") {
        const endIndex = typeof cursor === "number" ? cursor : rankedUsers.length;
        const startIndex = Math.max(0, endIndex - itemsPerPage);

        paginatedUsers = rankedUsers.slice(startIndex, endIndex);
        hasNextPage = endIndex < rankedUsers.length;
        hasPreviousPage = startIndex > 0;

        if (hasNextPage) {
          nextCursor = endIndex;
        }
        if (hasPreviousPage) {
          previousCursor = Math.max(0, startIndex - itemsPerPage);
        }
      }

      return ok({
        currentUser: currentUserEntry,
        leaderboard: paginatedUsers,
        hasNextPage,
        hasPreviousPage,
        nextCursor,
        previousCursor,
        totalCount: rankedUsers.length,
      });
    } catch (error: any) {
      logError("KarmaLeaderboardService.getCourseLeaderboard", error);
      return fail("Failed to fetch course leaderboard.", error.code || error.message);
    }
  }

  /**
   * Get user's rank in a specific course
   * @param userId - The user's ID
   * @param courseId - The course ID
   */
  async getUserRankInCourse(
    userId: string,
    courseId: string
  ): Promise<Result<{ rank: number; totalKarma: number; totalUsers: number; userName: string }>> {
    try {
      if (!userId || !courseId) {
        return fail("Missing userId or courseId");
      }

      const allKarmaQuery = query(
        collection(db, COLLECTION.KARMA_DAILY),
        where("courseId", "==", courseId)
      );

      const allKarmaSnapshot = await getDocs(allKarmaQuery);

      const userKarmaMap = new Map<
        string,
        {
          totalKarma: number;
          userName: string;
        }
      >();

      allKarmaSnapshot.docs.forEach((doc) => {
        const data = doc.data() as KarmaDaily;
        const existing = userKarmaMap.get(data.userId);

        if (existing) {
          userKarmaMap.set(data.userId, {
            totalKarma: existing.totalKarma + (data.karmaEarned || 0),
            userName: data.userName || existing.userName,
          });
        } else {
          userKarmaMap.set(data.userId, {
            totalKarma: data.karmaEarned || 0,
            userName: data.userName || "Unknown User",
          });
        }
      });

      const sortedUsers = Array.from(userKarmaMap.entries())
        .map(([uid, data]) => ({
          userId: uid,
          totalKarma: data.totalKarma,
          userName: data.userName,
        }))
        .sort((a, b) => b.totalKarma - a.totalKarma);

      const userIndex = sortedUsers.findIndex((u) => u.userId === userId);

      if (userIndex === -1) {
        return ok({
          rank: sortedUsers.length + 1,
          totalKarma: 0,
          totalUsers: sortedUsers.length,
          userName: "Unknown User",
        });
      }

      return ok({
        rank: userIndex + 1,
        totalKarma: sortedUsers[userIndex].totalKarma,
        totalUsers: sortedUsers.length,
        userName: sortedUsers[userIndex].userName,
      });
    } catch (error: any) {
      logError("KarmaLeaderboardService.getUserRankInCourse", error);
      return fail("Failed to fetch user rank.", error.code || error.message);
    }
  }

  /**
   * Get top N users for a course
   * @param courseId - The course ID
   * @param topN - Number of top users to fetch (default: 10)
   */
  async getTopUsers(courseId: string, topN: number = 10): Promise<Result<LeaderboardEntry[]>> {
    try {
      if (!courseId) {
        return fail("Missing courseId");
      }

      const allKarmaQuery = query(
        collection(db, COLLECTION.KARMA_DAILY),
        where("courseId", "==", courseId)
      );

      const allKarmaSnapshot = await getDocs(allKarmaQuery);

      const userKarmaMap = new Map<
        string,
        {
          totalKarma: number;
          userName: string;
        }
      >();

      allKarmaSnapshot.docs.forEach((doc) => {
        const data = doc.data() as KarmaDaily;
        const existing = userKarmaMap.get(data.userId);

        if (existing) {
          userKarmaMap.set(data.userId, {
            totalKarma: existing.totalKarma + (data.karmaEarned || 0),
            userName: data.userName || existing.userName,
          });
        } else {
          userKarmaMap.set(data.userId, {
            totalKarma: data.karmaEarned || 0,
            userName: data.userName || "Unknown User",
          });
        }
      });

      const sortedUsers = Array.from(userKarmaMap.entries())
        .map(([userId, data]) => ({
          userId,
          userName: data.userName,
          totalKarma: data.totalKarma,
        }))
        .sort((a, b) => b.totalKarma - a.totalKarma)
        .slice(0, topN)
        .map((user, index) => ({
          ...user,
          rank: index + 1,
        }));

      return ok(sortedUsers);
    } catch (error: any) {
      logError("KarmaLeaderboardService.getTopUsers", error);
      return fail("Failed to fetch top users.", error.code || error.message);
    }
  }
}

export const fetchDailyKarmaService = new fetchDailyKarma();