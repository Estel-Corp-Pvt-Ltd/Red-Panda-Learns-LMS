import { BookOpen, Check, ChevronDown, ChevronRight, Lock, NotepadText } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Course, Topic, TopicItem } from "@/types/course";
import { LearningProgress } from "@/types/learning-progress";
import { contentLockService } from "@/services/contentLockService";
import { ContentLock } from "@/types/content-lock";
import { useAuth } from "@/contexts/AuthContext";
import { USER_ROLE } from "@/constants";
import { isContentLocked } from "@/utils/is-content-locked";

/* ------------------------------------------------------------------ */
/* Sketchy squiggly line SVG between topic nodes                       */
/* ------------------------------------------------------------------ */

function SquigglyConnector({ from, to }: { from: string; to: string }) {
  const [path, setPath] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const computePath = useCallback(() => {
    const parent = containerRef.current?.closest("[data-flow-container]");
    if (!parent) return;
    const fromEl = parent.querySelector(`[data-topic-id="${from}"]`);
    const toEl = parent.querySelector(`[data-topic-id="${to}"]`);
    if (!fromEl || !toEl) return;

    const parentRect = parent.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const x1 = fromRect.left + fromRect.width / 2 - parentRect.left;
    const y1 = fromRect.bottom - parentRect.top;
    const x2 = toRect.left + toRect.width / 2 - parentRect.left;
    const y2 = toRect.top - parentRect.top;

    // Seed a deterministic "random" from the string IDs
    const seed = (from + to).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const wobble = (i: number) => Math.sin(seed * 0.1 + i * 1.7) * 8;

    const midY = (y1 + y2) / 2;
    const dx = x2 - x1;

    // Build a hand-drawn-looking path with multiple curve segments
    const points = [
      `M ${x1} ${y1}`,
      `C ${x1 + wobble(1)} ${y1 + (midY - y1) * 0.3 + wobble(2)},`,
      `  ${x1 + dx * 0.3 + wobble(3)} ${midY + wobble(4)},`,
      `  ${x1 + dx * 0.5 + wobble(5)} ${midY + wobble(6)}`,
      `S ${x2 + wobble(7)} ${y2 - (y2 - midY) * 0.3 + wobble(8)},`,
      `  ${x2} ${y2}`,
    ];

    setPath(points.join(" "));
  }, [from, to]);

  useEffect(() => {
    computePath();
    // Recompute on resize / expand-collapse
    const observer = new ResizeObserver(computePath);
    const parent = containerRef.current?.closest("[data-flow-container]");
    if (parent) observer.observe(parent);
    return () => observer.disconnect();
  }, [computePath]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-visible">
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        {path && (
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            className="text-muted-foreground/30"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="6 4"
          />
        )}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Topic Node (mind-map card style)                                    */
/* ------------------------------------------------------------------ */

function TopicNode({
  topic,
  course,
  currentLesson,
  onLessonClick,
  isLessonActive,
  isCompleted,
  topicLock,
  lessonLocks,
  isAdmin,
  index,
}: {
  topic: Topic;
  course: Course;
  currentLesson: TopicItem | null;
  onLessonClick: (lesson: TopicItem) => void;
  isLessonActive: (lessonId: string) => boolean;
  isCompleted: (lessonId: string) => boolean;
  topicLock?: ContentLock | null;
  lessonLocks: Record<string, ContentLock | null>;
  isAdmin: boolean;
}) {
  const hasActive = topic.items.some((item) => isLessonActive(item.id));
  const [isExpanded, setIsExpanded] = useState(hasActive);
  const completedCount = topic.items.filter((item) => isCompleted(item.id)).length;
  const totalItems = topic.items.filter((item) => {
    const lock = lessonLocks[item.id];
    return isAdmin || !isContentLocked(lock);
  }).length;
  const allDone = totalItems > 0 && completedCount === totalItems;

  return (
    <div data-topic-id={topic.id} className="relative">
      <Collapsible open={isExpanded} onOpenChange={() => setIsExpanded((p) => !p)}>
        {/* Topic card */}
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "w-full text-left rounded-xl border-2 p-3 transition-all",
              "hover:shadow-md hover:border-primary/30",
              hasActive
                ? "border-primary/40 bg-primary/5 shadow-sm"
                : allDone
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-border bg-card",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {/* Dot indicator */}
                <div
                  className={cn(
                    "h-3 w-3 rounded-full shrink-0 border-2",
                    hasActive
                      ? "bg-primary border-primary"
                      : allDone
                        ? "bg-green-500 border-green-500"
                        : "bg-transparent border-muted-foreground/40",
                  )}
                />
                <span className="font-medium text-sm truncate">{topic.title}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {topicLock?.isLocked && isAdmin && (
                  <Lock className="h-3.5 w-3.5 text-red-500" />
                )}
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {completedCount}/{totalItems}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Lesson items */}
        <CollapsibleContent className="mt-1 ml-4 space-y-0.5 border-l-2 border-dashed border-muted-foreground/15 pl-3">
          {topic.items
            .filter((lessonItem) => {
              const lock = lessonLocks[lessonItem.id];
              if (isAdmin) return true;
              return !isContentLocked(lock);
            })
            .map((lessonItem) => {
              const lock = lessonLocks[lessonItem.id];
              const active = isLessonActive(lessonItem.id);
              const done = isCompleted(lessonItem.id);

              return (
                <Link
                  key={lessonItem.id}
                  to={`/courses/${course.slug ?? course.id}/lesson/${lessonItem.id}`}
                  onClick={() =>
                    onLessonClick({
                      id: lessonItem.id,
                      type: lessonItem.type,
                      title: lessonItem.title,
                    })
                  }
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted/40 text-foreground/80",
                  )}
                >
                  {/* Icon */}
                  <div className="shrink-0">
                    {lessonItem.type === "LESSON" ? (
                      <BookOpen className={cn("h-4 w-4", active ? "text-primary" : "text-pink-500/70")} />
                    ) : (
                      <NotepadText className={cn("h-4 w-4", active ? "text-primary" : "text-blue-500/70")} />
                    )}
                  </div>

                  {/* Title */}
                  <span className="flex-1 min-w-0 truncate text-[13px] leading-snug">
                    {lessonItem.title}
                  </span>

                  {/* Status */}
                  <div className="shrink-0">
                    {done ? (
                      <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    ) : lock?.isLocked && isAdmin ? (
                      <Lock className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/25" />
                    )}
                  </div>
                </Link>
              );
            })}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Course Navigator — mind-map flow                                    */
/* ------------------------------------------------------------------ */

interface CourseNavigatorProps {
  course: Course;
  currentLesson: TopicItem | null;
  lessonHistory: string[] | LearningProgress["lessonHistory"];
  className?: string;
  onLessonClick: (lesson: TopicItem) => void;
}

export function CourseNavigator({
  course,
  currentLesson,
  className,
  lessonHistory,
  onLessonClick,
}: CourseNavigatorProps) {
  const params = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === USER_ROLE.ADMIN;

  const [topicLocks, setTopicLocks] = useState<Record<string, ContentLock | null>>({});
  const [lessonLocks, setLessonLocks] = useState<Record<string, ContentLock | null>>({});
  const [loadingLocks, setLoadingLocks] = useState(true);

  const isLessonActive = (lessonId: string) =>
    currentLesson?.id === lessonId || params.lessonId === lessonId;

  const isCompleted = (lessonId: string) => {
    if (!lessonHistory) return false;
    if (Array.isArray(lessonHistory)) return lessonHistory.includes(lessonId);
    const record = lessonHistory[lessonId];
    return !!record?.markedAsComplete;
  };

  useEffect(() => {
    if (!course?.topics?.length) return;

    const fetchLocks = async () => {
      try {
        setLoadingLocks(true);
        const topicIds = course.topics.map((t) => t.id);
        const lessonIds = course.topics.flatMap((t) => t.items.map((i) => i.id));
        const allContentIds = [...topicIds, ...lessonIds];
        const res = await contentLockService.getLocksByContentIds(allContentIds);

        const topicMap: Record<string, ContentLock | null> = {};
        topicIds.forEach((id) => (topicMap[id] = null));
        if (res.success) res.data.forEach((lock) => (topicMap[lock.contentId] = lock));
        setTopicLocks(topicMap);

        const lessonMap: Record<string, ContentLock | null> = {};
        lessonIds.forEach((id) => (lessonMap[id] = null));
        if (res.success) res.data.forEach((lock) => (lessonMap[lock.contentId] = lock));
        setLessonLocks(lessonMap);
      } catch (err) {
        console.error("Failed to fetch locks", err);
      } finally {
        setLoadingLocks(false);
      }
    };

    fetchLocks();
  }, [course?.topics]);

  const visibleTopics = course.topics.filter((topic) => {
    const lock = topicLocks[topic.id];
    if (isAdmin) return true;
    return !isContentLocked(lock);
  });

  if (loadingLocks) {
    return (
      <div className={cn("w-80 h-full border-r bg-card/50 p-6 flex items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-xs text-muted-foreground">Loading map…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-80 h-full border-r bg-card/50 flex flex-col", className)}>
      <div
        data-flow-container
        className="relative flex-1 py-6 px-4 overflow-y-auto overflow-x-hidden"
      >
        {/* Squiggly connectors between consecutive topic nodes */}
        {visibleTopics.map((topic, i) =>
          i < visibleTopics.length - 1 ? (
            <SquigglyConnector
              key={`conn-${topic.id}`}
              from={topic.id}
              to={visibleTopics[i + 1].id}
            />
          ) : null
        )}

        {/* Topic nodes with spacing */}
        <div className="relative z-10 flex flex-col gap-4">
          {visibleTopics.map((topic) => (
            <TopicNode
              key={topic.id}
              topic={topic}
              course={course}
              currentLesson={currentLesson}
              onLessonClick={onLessonClick}
              isLessonActive={isLessonActive}
              isCompleted={isCompleted}
              topicLock={topicLocks[topic.id]}
              lessonLocks={lessonLocks}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
