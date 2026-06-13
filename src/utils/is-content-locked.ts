// src/utils/is-content-locked.ts
import { ContentLock } from "@/types/content-lock";
import { useState, useEffect } from "react";
import { contentLockService } from "@/services/contentLockService";
import { useAuth } from "@/contexts/AuthContext";

interface UseContentLockResult {
  lock: ContentLock | null;
  isLocked: boolean;
  isLoading: boolean;
  timeRemaining: number | null; // milliseconds until unlock
}

/** Minimal user shape needed to evaluate lock scope. */
export interface LockScopeUser {
  organizationId?: string | null;
  class?: string | null;
  division?: string | null;
}

/**
 * Does a lock apply to this user?
 *  - appliesToAllUsers locks apply to everyone.
 *  - Otherwise the lock must match the user's organization, and its class /
 *    division (when set) must match the user's. An unset class/division on the
 *    lock means "all classes / all divisions in the org".
 */
export function lockAppliesToUser(lock: ContentLock, user?: LockScopeUser | null): boolean {
  if (lock.appliesToAllUsers) return true;
  if (!user) return false;
  if (!lock.organizationId) return false;
  if (lock.organizationId !== user.organizationId) return false;
  if (lock.class && lock.class !== user.class) return false;
  if (lock.division && lock.division !== user.division) return false;
  return true;
}

/**
 * From all locks on a content item, pick the one that governs this user.
 * Prefers an applicable lock that is currently locking; otherwise returns the
 * first applicable lock (or null if none apply).
 */
export function selectApplicableLock(
  locks: ContentLock[],
  user?: LockScopeUser | null
): ContentLock | null {
  const applicable = locks.filter((l) => lockAppliesToUser(l, user));
  if (applicable.length === 0) return null;
  return applicable.find((l) => isContentLocked(l)) ?? applicable[0];
}

// Helper to convert any date format to Date object
function toDate(value: any): Date | null {
  if (!value) return null;

  // Already a Date
  if (value instanceof Date) {
    return value;
  }

  // Firestore Timestamp with toDate method
  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  // Raw Firestore timestamp { seconds, nanoseconds }
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  return null;
}

export function isContentLocked(lock?: ContentLock | null): boolean {
  if (!lock) return false;
  if (!lock.isLocked) return false;
  if (!lock.scheduledAt) return true;

  const unlockDate = toDate(lock.scheduledAt);
  if (!unlockDate) return true;

  return unlockDate.getTime() > Date.now();
}

export function useContentLock(contentId: string | undefined): UseContentLockResult {
  const { user } = useAuth();
  const [lock, setLock] = useState<ContentLock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!contentId) {
      setIsLoading(false);
      setLock(null);
      return;
    }

    const fetchLock = async () => {
      setIsLoading(true);
      const result = await contentLockService.getLocksByContentId(contentId);

      if (result.success && result.data && result.data.length > 0) {
        // Select the lock that governs THIS user (org/class/division aware),
        // not just the first document returned.
        setLock(selectApplicableLock(result.data, user));
      } else {
        setLock(null);
      }
      setIsLoading(false);
    };

    fetchLock();
  }, [contentId, user?.organizationId, user?.class, user?.division]);

  // Countdown timer
  useEffect(() => {
    if (!lock?.isLocked || !lock.scheduledAt) {
      setTimeRemaining(null);
      return;
    }

    const unlockDate = toDate(lock.scheduledAt);

    if (!unlockDate) {
      setTimeRemaining(null);
      return;
    }

    const updateTimeRemaining = () => {
      const now = Date.now();
      const remaining = unlockDate.getTime() - now;

      if (remaining <= 0) {
        setTimeRemaining(null);
        // Content is now unlocked
        setLock((prev) => (prev ? { ...prev, isLocked: false } : null));
      } else {
        // Just store the number directly - no conversion needed!
        setTimeRemaining(remaining);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [lock?.isLocked, lock?.scheduledAt]);

  return {
    lock,
    isLocked: isContentLocked(lock),
    isLoading,
    timeRemaining,
  };
}