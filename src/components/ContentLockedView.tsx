// src/components/course/ContentLockedView.tsx
import { Lock, Clock } from "lucide-react";
import { ContentLock } from "@/types/content-lock";
import { formatDateTime, formatTimeRemaining } from "@/utils/date-time";

interface ContentLockedViewProps {
  lock: ContentLock;
  timeRemaining: number | null;
  isAdminView?: boolean;
}

export function ContentLockedView({
  lock,
  timeRemaining,
  isAdminView = false,
}: ContentLockedViewProps) {
  if (isAdminView) {
    return <AdminLockInfoPanel lock={lock} timeRemaining={timeRemaining} />;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>

        <h2 className="text-2xl font-bold mb-2">Content Locked</h2>

        <p className="text-muted-foreground mb-6">
          {"This content is currently locked and will be available soon."}
        </p>

        {timeRemaining !== null && (
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span>Unlocks in</span>
            </div>
            <div className="text-3xl font-mono font-bold text-primary">
              {formatTimeRemaining(timeRemaining)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminLockInfoPanel({ lock, timeRemaining }: Omit<ContentLockedViewProps, "isAdminView">) {
  return (
    <div className="w-full lg:w-80 shrink-0">
      <div className="bg-muted border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="h-5 w-5" />
          <h3 className="font-semibold text-muted-foreground">
            Content Locked (Admin View)
          </h3>
        </div>

        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            This content is locked for students. As an admin, you can still view it.
          </p>

          {timeRemaining !== null && (
            <div>
              <span className="font-medium text-muted-foreground">Unlocks in:</span>
              <p className="text-lg font-mono font-bold text-muted-foreground mt-1">
                {formatTimeRemaining(timeRemaining)}
              </p>
            </div>
          )}

          {lock.scheduledAt && (
            <div>
              <span className="font-medium text-muted-foreground">
                Scheduled unlock:
              </span>
              <p className="text-muted-foreground mt-1">
                {formatDateTime(lock.scheduledAt)}
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="font-medium text-muted-foreground">Lock ID:</span>
            <p className="text-xs text-muted-foreground font-mono mt-1">{lock.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
