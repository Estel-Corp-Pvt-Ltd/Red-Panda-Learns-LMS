// src/components/dashboard/StreakWidget.tsx — git-style heatmap streak visualization
import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { streakService } from "@/services/streakService";
import type { Streak } from "@/services/streakService";

const COLORS = {
  empty: "bg-muted/30",
  low: "bg-primary/20",
  mid: "bg-primary/50",
  high: "bg-primary/80",
  max: "bg-primary",
};

/** Generate a heatmap grid for the last 12 weeks (84 days). */
function generateHeatmapDays(lastActiveDate: string | null): Array<{ date: Date; intensity: "empty" | "low" | "mid" | "high" | "max" }> {
  const today = new Date();
  const days: typeof heatmapDays = [];

  // Last 84 days = 12 weeks
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);

    // Simple heuristic: if it's the lastActiveDate or recent, boost intensity.
    // In a real app, you'd track daily activity counts. For now, assume any activity is "max".
    const isActive = lastActiveDate && dStr === lastActiveDate.slice(0, 10);
    const intensity = isActive ? "max" : "empty";

    days.push({ date: d, intensity });
  }

  return days;
}

export function StreakWidget() {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);
  const [heatmapDays, setHeatmapDays] = useState<ReturnType<typeof generateHeatmapDays>>([]);

  useEffect(() => {
    let alive = true;
    streakService.getStreak().then((result) => {
      if (!alive) return;
      if (result.success) {
        setStreak(result.data);
        setHeatmapDays(generateHeatmapDays(result.data.lastActiveDate));
      }
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="h-full rounded-3xl bg-muted/40 animate-pulse" />;
  }

  if (!streak) return null;

  // 12 rows (weeks) × 7 cols (days)
  const weeks: Array<Array<typeof heatmapDays[0]>> = [];
  for (let i = 0; i < heatmapDays.length; i += 7) {
    weeks.push(heatmapDays.slice(i, i + 7));
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden rounded-3xl border-none bg-gradient-to-br from-orange-400/10 to-orange-300/5 p-4 shadow-lg">
      {/* Top: fire + stats */}
      <div className="flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-400/20 text-orange-500">
          <Flame className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Streak</p>
          <p className="text-2xl font-black leading-none text-orange-500">{streak.current}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] text-muted-foreground">Best</p>
          <p className="text-lg font-bold leading-none text-orange-600 dark:text-orange-400">{streak.longest}</p>
        </div>
      </div>

      {/* GitHub-style heatmap — week columns × 7 day rows, fills width */}
      <div className="flex flex-1 items-center">
        <div className="flex w-full justify-between gap-[3px]">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-1 flex-col gap-[3px]">
              {week.map((day, dayIdx) => (
                <div
                  key={`${weekIdx}-${dayIdx}`}
                  className={`aspect-square w-full rounded-[3px] ${COLORS[day.intensity]} transition-opacity hover:opacity-75`}
                  title={day.date.toLocaleDateString()}
                  aria-label={`${day.date.toLocaleDateString()}: ${day.intensity}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className={`h-2 w-2 rounded-sm ${COLORS.empty}`} />
        <div className={`h-2 w-2 rounded-sm ${COLORS.low}`} />
        <div className={`h-2 w-2 rounded-sm ${COLORS.mid}`} />
        <div className={`h-2 w-2 rounded-sm ${COLORS.high}`} />
        <div className={`h-2 w-2 rounded-sm ${COLORS.max}`} />
        <span>More</span>
      </div>
    </div>
  );
}

const heatmapDays = []; // placeholder for type inference
