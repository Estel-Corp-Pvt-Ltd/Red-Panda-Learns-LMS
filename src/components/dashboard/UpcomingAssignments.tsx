import { motion } from "framer-motion";
import { Calendar, ExternalLink, ClipboardList, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export interface Assignment {
  id: string;
  title: string;
  course: string;
  dueDate: Date;
}

function getDaysLeft(dueDate: Date) {
  const days = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "Overdue", urgent: true };
  if (days === 0) return { label: "Due today", urgent: true };
  if (days === 1) return { label: "Due tomorrow", urgent: true };
  return { label: `Due in ${days} days`, urgent: days <= 3 };
}

function AssignmentRow({ assignment, index }: { assignment: Assignment; index: number }) {
  const { label, urgent } = getDaysLeft(assignment.dueDate);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors"
    >
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", urgent ? "bg-red-100 dark:bg-red-900/30" : "bg-blue-100 dark:bg-blue-900/20")}>
        <Calendar className={cn("h-4 w-4", urgent ? "text-red-500" : "text-[#82b6ff]")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate leading-tight">{assignment.title}</p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{assignment.course}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("text-[10px] font-bold leading-tight", urgent ? "text-red-500" : "text-muted-foreground")}>{label}</p>
        <p className="text-[9px] text-muted-foreground mt-0.5">
          {assignment.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>
    </motion.div>
  );
}

interface UpcomingAssignmentsProps {
  assignments: Assignment[];
}

export function UpcomingAssignments({ assignments }: UpcomingAssignmentsProps) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Upcoming Assignments</h3>
        </div>
        <Link to="/submissions" className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5">
          View All <ExternalLink className="h-3 w-3 ml-0.5" />
        </Link>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-xs font-semibold text-foreground mb-0.5">All caught up!</p>
          <p className="text-[11px] text-muted-foreground">No upcoming assignments.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((a, i) => <AssignmentRow key={a.id} assignment={a} index={i} />)}
        </div>
      )}
    </div>
  );
}
