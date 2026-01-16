"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Trophy,
  Crown,
  Medal,
  Sparkles,
  Ghost,
} from "lucide-react";
import { fetchDailyKarmaService, LeaderboardEntry } from "@/services/karmaService/fetchkarmaDaily";
import SpotlightCard from "./spotlightCard";

interface LeaderboardProps {
  courseId: string;
  currentUserId: string;
  itemsPerPage?: number;
}

interface LeaderboardState {
  currentUser: LeaderboardEntry | null;
  leaderboard: LeaderboardEntry[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: number | null;
  previousCursor: number | null;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({
  courseId,
  currentUserId,
  itemsPerPage = 15,
}) => {
  const [state, setState] = useState<LeaderboardState>({
    currentUser: null,
    leaderboard: [],
    hasNextPage: false,
    hasPreviousPage: false,
    nextCursor: null,
    previousCursor: null,
    totalCount: 0,
    isLoading: true,
    error: null,
    currentPage: 1,
  });

  const fetchLeaderboard = useCallback(
    async (cursor: number | null = null, direction: "next" | "previous" = "next") => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await fetchDailyKarmaService.getCourseLeaderboard(courseId, currentUserId, {
          limit: itemsPerPage,
          pageDirection: direction,
          cursor: cursor,
        });
        console.log("the result from fetching", result);
        if (result.success && result.data) {
          setState((prev) => ({
            ...prev,
            currentUser: result.data.currentUser,
            leaderboard: result.data.leaderboard,
            hasNextPage: result.data.hasNextPage,
            hasPreviousPage: result.data.hasPreviousPage,
            nextCursor: result.data.nextCursor,
            previousCursor: result.data.previousCursor,
            totalCount: result.data.totalCount,
            isLoading: false,
            currentPage:
              direction === "next"
                ? cursor === null
                  ? 1
                  : prev.currentPage + 1
                : prev.currentPage - 1,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: "Unable to sync leaderboard",
          }));
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Network connection issue",
        }));
      }
    },
    [courseId, currentUserId, itemsPerPage]
  );

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // --- Logic Helpers ---

  const formatKarma = (karma: number): string => {
    const safeKarma = Math.max(0, karma);
    if (safeKarma >= 1000000) return (safeKarma / 1000000).toFixed(1) + "M";
    if (safeKarma >= 1000) return (safeKarma / 1000).toFixed(1) + "k";
    return safeKarma.toString();
  };

  // --- Render Helpers ---

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300 fill-gray-300/20" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600 fill-amber-600/20" />;
    return (
      <span className="font-mono text-zinc-500 font-bold w-5 text-center">
        {rank < 10 ? `0${rank}` : rank}
      </span>
    );
  };

  const getRowStyles = (rank: number, isCurrentUser: boolean) => {
    const base =
      "group relative flex items-center p-3 rounded-lg border transition-all duration-300 backdrop-blur-sm";

    let specific = "border-transparent hover:bg-white/5 hover:border-white/10";

    if (isCurrentUser) {
      specific = "bg-white/5 border-indigo-500/30 hover:border-indigo-500/50 hover:bg-white/10";
    } else if (rank === 1) {
      specific =
        "border-transparent hover:bg-gradient-to-r hover:from-yellow-500/10 hover:to-transparent hover:border-yellow-500/20";
    } else if (rank === 2) {
      specific =
        "border-transparent hover:bg-gradient-to-r hover:from-gray-300/10 hover:to-transparent hover:border-gray-300/20";
    } else if (rank === 3) {
      specific =
        "border-transparent hover:bg-gradient-to-r hover:from-amber-600/10 hover:to-transparent hover:border-amber-600/20";
    }

    return `${base} ${specific}`;
  };

  const renderRow = (entry: LeaderboardEntry, isPinned: boolean = false) => {
    const isMe = entry.userId === currentUserId;

    return (
      <div key={entry.userId} className={getRowStyles(entry.rank, isMe || isPinned)}>
        {/* Rank Column */}
        <div className="flex items-center justify-center w-12 mr-2">{getRankIcon(entry.rank)}</div>

        {/* User Info */}
        <div className="flex-1 flex items-center gap-3">
          <div
            className={`
w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold border
${
  isMe
    ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-200"
    : "bg-zinc-800 border-zinc-700 text-zinc-400 group-hover:border-zinc-600"
}
transition-colors
`}
          >
            {entry.userName.charAt(0).toUpperCase()}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm ${isMe ? "text-indigo-200" : "text-zinc-200"}`}>
                {entry.userName}
              </span>
              {isMe && (
                <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-bold tracking-wider">
                  YOU
                </span>
              )}
            </div>
            {/* Mobile Rank Display or Subtitle could go here */}
          </div>
        </div>

        {/* Karma Value */}
        <div className="text-right min-w-[80px]">
          <span
            className={`
font-mono font-bold tracking-tight
${
  entry.rank === 1
    ? "text-yellow-400"
    : entry.rank === 2
    ? "text-gray-300"
    : entry.rank === 3
    ? "text-amber-600"
    : "text-zinc-400"
}
`}
          >
            {formatKarma(entry.totalKarma)}
          </span>
          <span className="text-[10px] text-zinc-600 block uppercase tracking-widest font-semibold">
            Karma
          </span>
        </div>
      </div>
    );
  };

  return (
    <SpotlightCard className="w-full flex flex-col min-h-[600px] shadow-2xl shadow-black/50">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-white/5 flex items-end justify-between bg-black/20 backdrop-blur-md sticky top-0 z-20">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent flex items-center gap-2">
            Leaderboard
          </h2>
          <span className="text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase flex items-center gap-1 mt-1">
            <Sparkles size={10} className="text-indigo-400" /> Live Karma Rankings
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white leading-none tabular-nums">
            {state.totalCount}
          </div>
          <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mt-1">
            Participants
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative flex flex-col p-2">
        {/* Error State */}
        {state.error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 bg-black/50 backdrop-blur-sm z-30">
            <p className="mb-4 text-red-400/80 font-medium">{state.error}</p>
            <button
              className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-white rounded-md border border-zinc-700 transition-colors"
              onClick={() => fetchLeaderboard()}
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {state.isLoading && state.leaderboard.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[300px]">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            <span className="text-xs uppercase tracking-widest text-zinc-600 font-semibold animate-pulse">
              Syncing Data...
            </span>
          </div>
        )}

        {/* Empty State (No Data) - Per user requirement */}
        {!state.isLoading &&
          !state.error &&
          state.totalCount === 0 &&
          state.leaderboard.length === 0 &&
          !state.currentUser && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center min-h-[400px]">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full"></div>
                <Ghost className="w-16 h-16 text-zinc-700 relative z-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-zinc-300">It's quiet in here...</h3>
                <p className="text-sm text-zinc-500 max-w-[250px] mx-auto">
                  No karma has been earned yet. Be the first to break the silence!
                </p>
              </div>
            </div>
          )}

        {/* Data List */}
        {!state.isLoading && !state.error && state.totalCount > 0 && (
          <div className="flex flex-col gap-1 relative z-10">
            {/* Pinned Current User */}
            {state.currentUser && (
              <div className="mb-6 sticky top-0 z-20">
                <div className="px-2 py-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">
                    Your Position
                  </span>
                </div>
                {renderRow(state.currentUser, true)}
                <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-4"></div>
              </div>
            )}

            {/* List */}
            <div className="space-y-1 pb-4">
              {state.leaderboard.map((entry) => renderRow(entry))}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Pagination */}
      {(state.totalCount > 0 || state.currentUser) && (
        <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur flex justify-between items-center text-sm">
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            onClick={() => {
              if (state.hasPreviousPage && state.previousCursor !== null) {
                fetchLeaderboard(state.previousCursor, "previous");
              }
            }}
            disabled={!state.hasPreviousPage || state.isLoading}
          >
            <ArrowLeft size={14} /> <span className="hidden sm:inline">Prev</span>
          </button>

          <span className="text-zinc-500 font-mono text-xs tabular-nums bg-white/5 px-2 py-1 rounded">
            Page {state.currentPage}
          </span>

          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            onClick={() => {
              if (state.hasNextPage && state.nextCursor !== null) {
                fetchLeaderboard(state.nextCursor, "next");
              }
            }}
            disabled={!state.hasNextPage || state.isLoading}
          >
            <span className="hidden sm:inline">Next</span> <ArrowRight size={14} />
          </button>
        </div>
      )}
    </SpotlightCard>
  );
};

export default Leaderboard;
