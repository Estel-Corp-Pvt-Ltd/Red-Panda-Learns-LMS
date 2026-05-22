import { motion } from "framer-motion";
import { CheckCircle2, Trophy, Zap, Activity, BookOpen, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/hooks/useGameState";

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  lesson:     { icon: <CheckCircle2 className="h-4 w-4" />, bg: "bg-green-100 dark:bg-green-900/30",   text: "text-green-600 dark:text-green-400" },
  quiz:       { icon: <Trophy className="h-4 w-4" />,       bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400" },
  assignment: { icon: <BookOpen className="h-4 w-4" />,     bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400" },
  community:  { icon: <Users className="h-4 w-4" />,        bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-600 dark:text-yellow-400" },
  social:     { icon: <Zap className="h-4 w-4" />,          bg: "bg-blue-100 dark:bg-blue-900/30",     text: "text-blue-600 dark:text-blue-400" },
};

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.lesson;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="flex items-start gap-3"
    >
      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5", cfg.bg, cfg.text)}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0 border-b border-border/40 pb-2.5 last:border-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground leading-tight">{item.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.subtitle}</p>
          </div>
          {item.xpEarned > 0 && (
            <span className="text-[10px] font-bold text-primary shrink-0 bg-primary/10 rounded-full px-1.5 py-0.5 whitespace-nowrap">
              +{item.xpEarned} XP
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1">{item.timeAgo}</p>
      </div>
    </motion.div>
  );
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const visible = activities.slice(0, 6);
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
        </div>
        <button className="text-[11px] font-semibold text-primary hover:underline">View All</button>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-muted flex items-center justify-center">
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Start learning to see your activity here</p>
        </div>
      ) : (
        <div className="space-y-0">
          {visible.map((item, i) => <ActivityRow key={item.id} item={item} index={i} />)}
        </div>
      )}
    </div>
  );
}
