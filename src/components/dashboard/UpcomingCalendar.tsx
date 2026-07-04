// src/components/dashboard/UpcomingCalendar.tsx — calendar of upcoming assignment + quiz deadlines.
import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, AlertCircle, ClipboardList, FileText, CalendarDays } from "lucide-react";
import { assignmentService } from "@/services/assignmentService";
import { quizService } from "@/services/quizService";
import type { Enrollment } from "@/types/enrollment";
import type { Assignment } from "@/types/assignment";
import type { Quiz } from "@/types/quiz";

interface CalendarEvent {
  date: Date;
  type: "assignment" | "quiz";
  title: string;
  courseName: string;
  daysUntil: number;
}

/** Firestore Timestamp | Date | ISO string → Date (or null). */
function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object" && typeof (v as any).toDate === "function") return (v as any).toDate();
  if (typeof v === "string" || typeof v === "number") { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  return null;
}

function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

export function UpcomingCalendar({ enrollments, userId }: { enrollments: Enrollment[]; userId: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());

  useEffect(() => {
    let alive = true;
    (async () => {
      const courseIds = enrollments.map((e) => e.courseId);
      const courseName = Object.fromEntries(enrollments.map((e) => [e.courseId, e.courseName || "Course"]));
      const today = startOfToday();
      const collected: CalendarEvent[] = [];

      try {
        // Assignments — one query per enrolled course.
        const assignmentLists = await Promise.all(
          courseIds.map((id) =>
            assignmentService.getFilteredAssignments([{ field: "courseId", op: "==", value: id }])
              .then((list) => list.map((a) => ({ a, courseId: id })))
              .catch(() => [] as { a: Assignment; courseId: string }[])
          )
        );
        for (const { a, courseId } of assignmentLists.flat()) {
          const d = toDate(a.deadline);
          if (d && d >= today) {
            collected.push({
              date: d, type: "assignment", title: a.title, courseName: courseName[courseId],
              daysUntil: Math.ceil((d.getTime() - Date.now()) / 86_400_000),
            });
          }
        }

        // Quizzes — single batched query for all courses.
        if (courseIds.length && userId) {
          const quizRes = await quizService.getQuizzesByCoursesForUser(courseIds, userId);
          if (quizRes.success) {
            for (const q of quizRes.data as Quiz[]) {
              const d = toDate(q.endAt) ?? toDate(q.scheduledAt);
              if (d && d >= today) {
                collected.push({
                  date: d, type: "quiz", title: q.title, courseName: courseName[q.courseId] || "Course",
                  daysUntil: Math.ceil((d.getTime() - Date.now()) / 86_400_000),
                });
              }
            }
          }
        }
      } catch { /* leave whatever we collected */ }

      collected.sort((x, y) => x.date.getTime() - y.date.getTime());
      if (alive) { setEvents(collected); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [enrollments, userId]);

  // Group events by yyyy-mm-dd for quick lookup while rendering the grid.
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = e.date.toISOString().slice(0, 10);
      (map.get(key) ?? map.set(key, []).get(key)!).push(e);
    }
    return map;
  }, [events]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const monthName = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  if (loading) return <div className="h-full min-h-[20rem] rounded-3xl bg-muted/40 animate-pulse" />;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border-none bg-gradient-to-br from-sky-400/10 to-sky-300/5 p-4 shadow-lg">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-sky-400/20 text-sky-600 dark:text-sky-400">
            <CalendarDays className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-bold text-foreground">{monthName}</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} aria-label="Previous month"
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} aria-label="Next month"
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`b${idx}`} />;
          const key = new Date(year, month, day).toISOString().slice(0, 10);
          const dayEvents = eventsByDate.get(key) ?? [];
          const urgent = dayEvents.some((e) => e.daysUntil <= 3);
          const isToday = key === new Date().toISOString().slice(0, 10);
          return (
            <div
              key={day}
              title={dayEvents.map((e) => `${e.type === "quiz" ? "Quiz" : "Assignment"}: ${e.title}`).join("\n") || undefined}
              className={[
                "relative flex aspect-square items-center justify-center rounded-lg text-xs font-medium transition-colors",
                dayEvents.length
                  ? urgent ? "bg-red-500/20 text-red-600 dark:text-red-400" : "bg-sky-500/20 text-sky-600 dark:text-sky-400"
                  : "text-muted-foreground/70 hover:bg-muted/50",
                isToday ? "ring-2 ring-primary" : "",
              ].join(" ")}
            >
              {day}
              {dayEvents.length > 0 && (
                <span className={`absolute bottom-1 h-1 w-1 rounded-full ${urgent ? "bg-red-500" : "bg-sky-500"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Next-due list */}
      <div className="mt-4 flex-1 space-y-1.5 border-t border-primary/10 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Next due</p>
        {events.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">No upcoming deadlines 🎉</p>
        ) : (
          events.slice(0, 3).map((e, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-background/50 p-2 text-xs">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${e.type === "quiz" ? "bg-purple-500/15 text-purple-600 dark:text-purple-400" : "bg-sky-500/15 text-sky-600 dark:text-sky-400"}`}>
                {e.type === "quiz" ? <ClipboardList className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{e.title}</p>
                <p className="truncate text-[10px] text-muted-foreground">{e.courseName}</p>
              </div>
              <span className={`flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] font-semibold ${e.daysUntil <= 3 ? "text-red-600 dark:text-red-400" : "text-sky-600 dark:text-sky-400"}`}>
                {e.daysUntil <= 3 && <AlertCircle className="h-3 w-3" />}
                {e.daysUntil <= 0 ? "Today" : e.daysUntil === 1 ? "Tomorrow" : `${e.daysUntil}d`}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
