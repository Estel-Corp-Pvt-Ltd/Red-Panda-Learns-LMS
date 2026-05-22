import { motion } from "framer-motion";
import { Star, Flame, Trophy, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { GameState } from "@/hooks/useGameState";

interface StatCardsProps {
  gameState: GameState;
  totalEnrollments: number;
}

interface CardConfig {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  gradient: string;
  iconBg: string;
  progress?: number;
  progressColor?: string;
}

export function StatCards({ gameState, totalEnrollments }: StatCardsProps) {
  const { xp, level, xpEarnedThisLevel, xpForNextLevel, streak, bestStreak, badgesEarned, weeklyXP } = gameState;
  const levelProgress = xpForNextLevel > 0 ? Math.round((xpEarnedThisLevel / xpForNextLevel) * 100) : 100;

  const cards: CardConfig[] = [
    {
      icon: <Star className="h-6 w-6 text-white" />,
      label: "XP Earned",
      value: xp.toLocaleString(),
      sub: `+${weeklyXP} this week`,
      gradient: "from-amber-400 to-orange-500",
      iconBg: "bg-amber-500",
      progress: levelProgress,
      progressColor: "bg-amber-400",
    },
    {
      icon: <Flame className="h-6 w-6 text-white" />,
      label: "Current Streak",
      value: `${streak} Days`,
      sub: `Best: ${bestStreak} days`,
      gradient: "from-orange-400 to-red-500",
      iconBg: "bg-orange-500",
    },
    {
      icon: <Trophy className="h-6 w-6 text-white" />,
      label: "Current Level",
      value: `Level ${level}`,
      sub: `${xpEarnedThisLevel} / ${xpForNextLevel} XP`,
      gradient: "from-violet-400 to-purple-600",
      iconBg: "bg-violet-500",
      progress: levelProgress,
      progressColor: "bg-violet-400",
    },
    {
      icon: <Award className="h-6 w-6 text-white" />,
      label: "Badges Earned",
      value: badgesEarned,
      sub: `${totalEnrollments} course${totalEnrollments !== 1 ? "s" : ""} enrolled`,
      gradient: "from-emerald-400 to-teal-500",
      iconBg: "bg-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.4, ease: "easeOut" }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="rounded-2xl bg-card border border-border shadow-sm p-4 flex flex-col gap-3 cursor-default"
        >
          {/* Icon + value row */}
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0 shadow-md`}>
              {card.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold text-foreground leading-none">
                {card.value}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 font-medium leading-tight">
                {card.label}
              </div>
            </div>
          </div>

          {/* Progress bar (optional) */}
          {card.progress != null && (
            <Progress
              value={card.progress}
              className="h-1.5 rounded-full bg-muted"
            />
          )}

          {/* Sub label */}
          <p className={`text-[11px] font-semibold leading-tight ${i === 1 ? "text-orange-500" : "text-muted-foreground"}`}>
            {card.sub}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
