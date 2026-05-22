import { motion } from "framer-motion";
import { CheckCircle2, PlayCircle, Brain, Zap, Target, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyQuest } from "@/hooks/useGameState";

const QUEST_ICON: Record<string, React.ReactNode> = {
  earn_learning_xp: <PlayCircle className="h-4 w-4" />,
  ace_quiz:         <Brain className="h-4 w-4" />,
  earn_50_xp:       <Zap className="h-4 w-4" />,
};

const QUEST_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  earn_learning_xp: { bg: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-600 dark:text-blue-400",   bar: "bg-blue-500" },
  ace_quiz:         { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", bar: "bg-purple-500" },
  earn_50_xp:       { bg: "bg-amber-100 dark:bg-amber-900/30",  text: "text-amber-600 dark:text-amber-400",  bar: "bg-amber-500" },
};

interface DailyQuestsProps {
  quests: DailyQuest[];
  onCompleteQuest?: (questId: string) => void;
}

function QuestRow({ quest, index, onComplete }: { quest: DailyQuest; index: number; onComplete?: () => void }) {
  const pct = quest.goal > 0 ? Math.min((quest.progress / quest.goal) * 100, 100) : 0;
  const colors = QUEST_COLORS[quest.id] ?? { bg: "bg-muted", text: "text-muted-foreground", bar: "bg-primary" };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3, ease: "easeOut" }}
      whileHover={!quest.completed ? { x: 2 } : {}}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 group",
        quest.completed
          ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30"
          : "bg-card border-border hover:border-primary/30 hover:shadow-sm cursor-pointer"
      )}
      onClick={() => { if (!quest.completed && pct >= 100 && onComplete) onComplete(); }}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
        quest.completed ? "bg-green-100 dark:bg-green-900/30 text-green-600" : cn(colors.bg, colors.text)
      )}>
        {quest.completed ? <CheckCircle2 className="h-4 w-4" /> : (QUEST_ICON[quest.id] ?? <Target className="h-4 w-4" />)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className={cn(
            "text-xs font-semibold leading-tight truncate",
            quest.completed ? "text-green-700 dark:text-green-400 line-through opacity-70" : "text-foreground"
          )}>
            {quest.title}
          </p>
          <span className={cn(
            "text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0",
            quest.completed
              ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          )}>
            +{quest.xpReward} XP
          </span>
        </div>

        <p className="text-[10px] text-muted-foreground leading-tight mb-1.5">{quest.description}</p>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", quest.completed ? "bg-green-500" : colors.bar)}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: 0.25 + index * 0.08, duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground shrink-0 tabular-nums">
            {quest.progress}/{quest.goal}
          </span>
        </div>
      </div>

      <div className="shrink-0">
        {quest.completed
          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
        }
      </div>
    </motion.div>
  );
}

export function DailyQuests({ quests, onCompleteQuest }: DailyQuestsProps) {
  const completedCount = quests.filter((q) => q.completed).length;
  const totalXP = quests.reduce((s, q) => s + q.xpReward, 0);

  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground leading-tight">Daily Quests</h3>
            <p className="text-[10px] text-muted-foreground">
              {quests.length === 0 ? "Start learning to unlock" : `${completedCount}/${quests.length} done · ${totalXP} XP`}
            </p>
          </div>
        </div>
        {quests.length > 0 && (
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            completedCount === quests.length
              ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              : "bg-primary/10 text-primary"
          )}>
            {completedCount === quests.length ? "All done!" : `${Math.round((completedCount / quests.length) * 100)}%`}
          </span>
        )}
      </div>

      {quests.length > 0 && (
        <div className="mb-3">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[#82b6ff]"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / quests.length) * 100}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {quests.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-muted flex items-center justify-center">
            <Target className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Start learning to unlock your daily quests</p>
        </div>
      ) : (
        <div className="space-y-2">
          {quests.map((quest, i) => (
            <QuestRow key={quest.id} quest={quest} index={i} onComplete={() => onCompleteQuest?.(quest.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
