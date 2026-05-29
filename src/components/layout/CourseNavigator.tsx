import { Check, ChevronDown, ChevronRight, FileText, Lock } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Course, Topic, TopicItem } from "@/types/course";
import { LearningProgress } from "@/types/learning-progress";
import { contentLockService } from "@/services/contentLockService";
import { ContentLock } from "@/types/content-lock";
import { useAuth } from "@/contexts/AuthContext";
import { USER_ROLE } from "@/constants";
import { isContentLocked } from "@/utils/is-content-locked";

const stripNumberPrefix = (value: string) => value.replace(/^\s*\d+[.)]\s*/, "");

function TopicSection({
  topic,
  course,
  onLessonClick,
  isLessonActive,
  isCompleted,
  topicLock,
  lessonLocks,
  isAdmin,
  topicIndex,
  lessonIndexById,
}: {
  topic: Topic;
  course: Course;
  onLessonClick: (lesson: TopicItem) => void;
  isLessonActive: (lessonId: string) => boolean;
  isCompleted: (lessonId: string) => boolean;
  topicLock?: ContentLock | null;
  lessonLocks: Record<string, ContentLock | null>;
  isAdmin: boolean;
  topicIndex: number;
  lessonIndexById: Record<string, number>;
}) {
  const hasActive = topic.items.some((item) => isLessonActive(item.id));
  const [isExpanded, setIsExpanded] = useState(hasActive);
  const visibleItems = topic.items.filter((item) => {
    const lock = lessonLocks[item.id];
    return isAdmin || !isContentLocked(lock);
  });
  const completedCount = visibleItems.filter((item) => isCompleted(item.id)).length;
  const totalItems = visibleItems.length;
  const allDone = totalItems > 0 && completedCount === totalItems;

  useEffect(() => {
    if (hasActive) setIsExpanded(true);
  }, [hasActive]);

  return (
    <div className="border-b border-white/[0.06] last:border-b-0">
      <Collapsible open={isExpanded} onOpenChange={() => setIsExpanded((previous) => !previous)}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
              "hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-inset",
              hasActive ? "bg-gradient-to-r from-blue-950/40 to-transparent text-white" : "text-slate-200",
              allDone && "text-white",
            )}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <FileText className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.8} />
              <span className="truncate text-[13px] font-semibold leading-5">
                {topicIndex + 1}. {stripNumberPrefix(topic.title)}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-2">
              {topicLock?.isLocked && isAdmin && <Lock className="h-3.5 w-3.5 text-red-400" />}
              <span className="text-[11px] font-medium tabular-nums text-slate-300">
                {completedCount}/{totalItems}
              </span>
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-300" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
              )}
            </span>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="pb-2">
          <div className="relative ml-7 space-y-1 pl-4">
            <div className="absolute bottom-3 left-0 top-0 w-px bg-slate-600/70" />

            {visibleItems.map((lessonItem) => {
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
                    "group relative mr-2 flex min-h-8 items-center gap-3 rounded-md border px-3 py-2 text-sm transition-all",
                    active
                      ? "border-blue-500/70 bg-blue-950/50 text-white shadow-[inset_3px_0_0_#f97316]"
                      : "border-transparent text-slate-400 hover:border-blue-500/30 hover:bg-blue-950/20 hover:text-slate-100",
                  )}
                >
                  <span
                    className={cn(
                      "absolute -left-[21px] top-1/2 z-10 h-3 w-3 -translate-y-1/2 rounded-full border-2 bg-[#070b16]",
                      active
                        ? "border-orange-500 shadow-[0_0_0_3px_rgba(249,115,22,0.14)]"
                        : "border-slate-500",
                    )}
                  >
                    {active && (
                      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500" />
                    )}
                  </span>

                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[13px] font-medium leading-4",
                      active && "font-semibold text-white",
                    )}
                  >
                    <span className={active ? "text-orange-400" : "text-slate-400"}>
                      {lessonIndexById[lessonItem.id]}.
                    </span>{" "}
                    {stripNumberPrefix(lessonItem.title)}
                  </span>

                  <span className="shrink-0">
                    {done ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </span>
                    ) : lock?.isLocked && isAdmin ? (
                      <Lock className="h-3.5 w-3.5 text-red-400" />
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

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
    if (!course?.topics?.length) {
      setLoadingLocks(false);
      return;
    }

    const fetchLocks = async () => {
      try {
        setLoadingLocks(true);
        const topicIds = course.topics.map((topic) => topic.id);
        const lessonIds = course.topics.flatMap((topic) => topic.items.map((item) => item.id));
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
      <div
        className={cn(
          "flex h-full w-80 items-center justify-center border-r border-white/10 bg-[#060a14] p-6",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          <p className="text-xs text-slate-400">Loading navigator...</p>
        </div>
      </div>
    );
  }

  const visibleLessonIds = visibleTopics.flatMap((topic) =>
    topic.items
      .filter((item) => {
        const lock = lessonLocks[item.id];
        return isAdmin || !isContentLocked(lock);
      })
      .map((item) => item.id),
  );
  const lessonIndexById = visibleLessonIds.reduce<Record<string, number>>((acc, id, index) => {
    acc[id] = index + 1;
    return acc;
  }, {});

  return (
    <div
      className={cn(
        "flex h-full w-80 flex-col border-r border-white/10 bg-[#070b16] text-slate-200 shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]",
        className,
      )}
    >
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden p-2">
        <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#080d1a]/95 shadow-[0_14px_36px_rgba(0,0,0,0.24)]">
          {visibleTopics.map((topic, topicIndex) => (
            <TopicSection
              key={topic.id}
              topic={topic}
              course={course}
              onLessonClick={onLessonClick}
              isLessonActive={isLessonActive}
              isCompleted={isCompleted}
              topicLock={topicLocks[topic.id]}
              lessonLocks={lessonLocks}
              isAdmin={isAdmin}
              topicIndex={topicIndex}
              lessonIndexById={lessonIndexById}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
