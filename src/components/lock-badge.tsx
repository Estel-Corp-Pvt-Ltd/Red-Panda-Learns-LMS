// src/components/ui/lock-badge.tsx
import { Lock } from "lucide-react";

interface LockBadgeProps {
  className?: string;
}

export function LockBadge({ className }: LockBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full ${className}`}
    >
      <Lock className="h-3 w-3" />
      Locked
    </span>
  );
}