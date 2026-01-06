import { BookOpen, Check, ChevronDown, ChevronRight, Lock, NotepadText } from "lucide-react";
import { Button } from "@/components/ui/button";
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

/* ------------------------------------------------------------------ */
/* Topic Section                                                       */
/* ------------------------------------------------------------------ */

function TopicSection({
  topic,
  course,
  currentLesson,
  lessonHistory,
  onLessonClick,
  isLessonActive,
  isCompleted,
  topicLock,
  lessonLocks,
  isAdmin,
}: {
  topic: Topic;
  course: Course;
  currentLesson: TopicItem | null;
  lessonHistory: string[] | LearningProgress["lessonHistory"];
  onLessonClick: (lesson: TopicItem) => void;
  isLessonActive: (lessonId: string) => boolean;
  isCompleted: (lessonId: string) => boolean;
  topicLock?: ContentLock | null;
  lessonLocks: Record<string, ContentLock | null>;
  isAdmin: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(topic.items.some((item) => isLessonActive(item.id)));

  return (
    <Collapsible open={isExpanded} onOpenChange={() => setIsExpanded((p) => !p)}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto text-left hover:bg-muted/50 items-start"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm break-words leading-snug">{topic.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{topic.items.length} lessons</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {topicLock?.isLocked && isAdmin && <Lock className="h-4 w-4 text-red-500" />}
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-1 mt-1">
        {topic.items
          .filter((lessonItem) => {
            const lock = lessonLocks[lessonItem.id];
            if (isAdmin) return true;
            return !isContentLocked(lock);
          })
          .map((lessonItem) => {
            const lock = lessonLocks[lessonItem.id];
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
                  "block ml-6 p-3 rounded-lg transition-all",
                  isLessonActive(lessonItem.id) &&
                    "bg-primary/5 border border-primary/20 ring-1 ring-primary/10",
                  "hover:bg-muted/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    {lessonItem.type === "LESSON" ? (
                      <BookOpen className="text-pink-500" />
                    ) : (
                      <NotepadText className="text-blue-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "text-sm font-medium break-words leading-snug",
                        isLessonActive(lessonItem.id) ? "text-primary" : "text-foreground"
                      )}
                    >
                      {lessonItem.title}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "w-5 h-5 flex items-center justify-center border rounded-full",
                      isCompleted(lessonItem.id) && "bg-primary"
                    )}
                  >
                    {isCompleted(lessonItem.id) && <Check className="w-4 h-4 text-white" />}
                    {lock?.isLocked && isAdmin && <Lock className="w-4 h-4 text-red-500" />}
                  </div>
                </div>
              </Link>
            );
          })}
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ------------------------------------------------------------------ */
/* Course Navigator                                                    */
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

  /* ---------------- Fetch topic & lesson locks ---------------- */

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

  if (loadingLocks) {
    return (
      <div className="w-80 h-full border-r bg-card/50 p-4 text-sm text-muted-foreground">
        Loading course content…
      </div>
    );
  }

  return (
    <div className={cn("w-80 h-full border-r bg-card/50 flex flex-col", className)}>
      <div className="flex-1 py-4 mr-2 overflow-y-auto overflow-x-hidden">
        {course.topics
          .filter((topic) => {
            const lock = topicLocks[topic.id];
            if (isAdmin) return true; // Admin sees everything
            return !isContentLocked(lock); // Others see only unlocked topics
          })
          .map((topic) => (
            <TopicSection
              key={topic.id}
              topic={topic}
              course={course}
              currentLesson={currentLesson}
              lessonHistory={lessonHistory}
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
  );
}
