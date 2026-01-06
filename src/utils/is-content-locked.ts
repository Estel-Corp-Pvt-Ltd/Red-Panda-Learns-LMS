import { ContentLock } from "@/types/content-lock";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */


export function isContentLocked(lock?: ContentLock | null): boolean {
  if (!lock) return false;
  if (!lock.isLocked) return false;
  if (!lock.scheduledAt) return true;
  return lock.scheduledAt.toDate() > new Date();
}
