import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Star, Zap, Flame, Trophy, BookOpen, GraduationCap, Crown, Footprints, Lock,
} from "lucide-react";
import type { Achievement } from "@/hooks/useGameState";

const ACHIEVEMENT_ICON: Record<string, React.ReactNode> = {
  first_step:         <Footprints className="h-4 w-4" />,
  karma_starter:      <Zap className="h-4 w-4" />,
  consistent_learner: <Flame className="h-4 w-4" />,
  quiz_scorer:        <Trophy className="h-4 w-4" />,
  dedicated_learner:  <BookOpen className="h-4 w-4" />,
  course_completer:   <GraduationCap className="h-4 w-4" />,
  xp_champion:        <Crown className="h-4 w-4" />,
};

function AchievementRow({ achievement, index }: { achievement: Achievement; index: number }) {
  const earned = achievement.earnedDate !== null;
  const icon = ACHIEVEMENT_ICON[achievement.id] ?? <Star className="h-4 w-4" />;

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex items-center gap-3 p-2.5 rounded-xl border transition-colors",
        earned
          ? "bg-card border-border hover:bg-muted/40"
          : "bg-muted/20 border-dashed border-border/40 opacity-50"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
        earned ? achievement.color : "bg-muted text-muted-foreground"
      )}>
        {earned ? icon : <Lock className="h-3.5 w-3.5" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-bold leading-tight truncate", earned ? "text-foreground" : "text-muted-foreground")}>
          {achievement.title}
        </p>
        <p className="text-[10px] text-muted-foreground leading-tight truncate">{achievement.description}</p>
      </div>

      <div className="shrink-0 text-right">
        {earned ? (
          <>
            <p className="text-[9px] text-muted-foreground">Earned</p>
            <p className="text-[10px] font-semibold text-foreground">
              {new Date(achievement.earnedDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </>
        ) : (
          <span className="text-[9px] text-muted-foreground/50 font-medium">Locked</span>
        )}
      </div>
    </motion.div>
  );
}

interface RecentAchievementsProps {
  achievements: Achievement[];
}

export function RecentAchievements({ achievements }: RecentAchievementsProps) {
  const earned = achievements.filter((a) => a.earnedDate !== null);
  const visible = achievements.slice(0, 5);

  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground leading-tight">Achievements</h3>
            <p className="text-[10px] text-muted-foreground">{earned.length} of {achievements.length} earned</p>
          </div>
        </div>
        <button className="text-[11px] font-semibold text-primary hover:underline transition-colors">
          View All
        </button>
      </div>

      <div className="space-y-1.5">
        {visible.map((a, i) => (
          <AchievementRow key={a.id} achievement={a} index={i} />
        ))}
      </div>
    </div>
  );
}
