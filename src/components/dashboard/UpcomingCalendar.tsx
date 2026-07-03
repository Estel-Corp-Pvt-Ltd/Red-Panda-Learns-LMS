// src/components/dashboard/UpcomingCalendar.tsx — calendar showing upcoming assignments + quizzes
import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { enrollmentService } from "@/services/enrollmentService";
import { assignmentService } from "@/services/assignmentService";
import type { Enrollment } from "@/types/enrollment";
import type { Assignment } from "@/types/assignment";

interface CalendarEvent {
  date: Date;
  type: "assignment" | "quiz";
  title: string;
  courseId: string;
  courseName?: string;
  daysUntil: number;
}

export function UpcomingCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    let alive = true;
    const fetchUpcoming = async () => {
      try {
        // Fetch enrollments to get course info
        const enrollResult = await enrollmentService.getUserEnrollments();
        if (!enrollResult.success || !alive) return;

        const enrollments = enrollResult.data as Enrollment[];
        const courseMap = Object.fromEntries(enrollments.map((e) => [e.courseId, e.courseName || "Course"]));

        const allEvents: CalendarEvent[] = [];
        const now = new Date();
        const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        // Fetch assignments for each course
        for (const enrollment of enrollments) {
          const assignResult = await assignmentService.getAssignmentsByCourse(enrollment.courseId);
          if (assignResult.success && Array.isArray(assignResult.data)) {
            (assignResult.data as Assignment[]).forEach((assign) => {
              if (assign.deadline) {
                const deadlineDate = assign.deadline instanceof Date ? assign.deadline : assign.deadline.toDate?.();
                if (deadlineDate && deadlineDate >= now && deadlineDate <= twoWeeksOut) {
                  const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                  allEvents.push({
                    date: deadlineDate,
                    type: "assignment",
                    title: assign.title,
                    courseId: enrollment.courseId,
                    courseName: courseMap[enrollment.courseId],
                    daysUntil,
                  });
                }
              }
            });
          }
        }

        // Sort by date
        allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
        if (alive) setEvents(allEvents);
      } catch (err) {
        console.error("Failed to fetch upcoming events:", err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchUpcoming();
    return () => { alive = false; };
  }, []);

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthDays = useMemo(() => {
    const days: (number | null)[] = Array(firstDayOfMonth).fill(null);
    for (let i = 1; i <= daysInMonth(currentDate); i++) {
      days.push(i);
    }
    return days;
  }, [currentDate, firstDayOfMonth]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((evt) => {
      const key = evt.date.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(evt);
    });
    return map;
  }, [events]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  if (loading) {
    return <div className="rounded-3xl h-full bg-muted/40 animate-pulse" />;
  }

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border-none bg-gradient-to-br from-blue-400/10 to-blue-300/5 p-4 shadow-lg">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-blue-400/20 text-blue-600 dark:text-blue-400">
            <Clock className="h-4 w-4" />
          </span>
          <h3 className="font-semibold text-foreground">{monthName}</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-primary/10">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={nextMonth} className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-primary/10">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="mb-3 grid flex-1 grid-cols-7 gap-1 overflow-hidden">
        {monthDays.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="bg-transparent" />;
          }

          const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().slice(0, 10);
          const dayEvents = eventsByDate.get(dateStr) || [];
          const hasEvent = dayEvents.length > 0;
          const isUrgent = dayEvents.some((e) => e.daysUntil <= 3);

          return (
            <div
              key={day}
              className={`relative flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                hasEvent
                  ? isUrgent
                    ? "bg-red-500/20 text-red-600 dark:text-red-400"
                    : "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                  : "bg-muted/40 text-muted-foreground"
              } hover:brightness-110`}
            >
              <span>{day}</span>
              {hasEvent && (
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {dayEvents.slice(0, 2).map((_, i) => (
                    <div key={i} className={`h-1 w-1 rounded-full ${isUrgent ? "bg-red-500" : "bg-blue-500"}`} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upcoming list */}
      <div className="space-y-2 border-t border-primary/10 pt-3">
        <p className="text-[10px] font-medium text-muted-foreground uppercase">Next due</p>
        <div className="space-y-1.5">
          {events.slice(0, 3).map((evt, idx) => (
            <div key={idx} className="flex items-start gap-2 rounded-lg bg-background/50 p-2 text-xs">
              <div className="mt-0.5">
                {evt.daysUntil <= 3 ? (
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{evt.title}</p>
                <p className="text-[9px] text-muted-foreground">{evt.courseName}</p>
              </div>
              <span className={`text-[9px] font-semibold whitespace-nowrap ${evt.daysUntil <= 3 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
                {evt.daysUntil === 0 ? "Today" : evt.daysUntil === 1 ? "Tomorrow" : `${evt.daysUntil}d`}
              </span>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No upcoming deadlines</p>
          )}
        </div>
      </div>
    </div>
  );
}
