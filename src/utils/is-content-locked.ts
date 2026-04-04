// src/utils/is-content-locked.ts
import { ContentLock } from "@/types/content-lock";
import { useState, useEffect } from "react";
import { contentLockService } from "@/services/contentLockService";

interface UseContentLockResult {
  lock: ContentLock | null;
  isLocked: boolean;
  isLoading: boolean;
  timeRemaining: number | null; // milliseconds until unlock
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
        setLock(result.data[0]);
      } else {
        setLock(null);
      }
      setIsLoading(false);
    };

    fetchLock();
  }, [contentId]);

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