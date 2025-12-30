import { BookOpen, Check, ChevronDown, ChevronRight, Lock, NotepadText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Course, Topic, TopicItem } from "@/types/course";
import { LearningProgress } from "@/types/learning-progress";

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

  const isLessonActive = (lessonId: string) => {
    return (currentLesson && currentLesson.id === lessonId) || params.lessonId === lessonId;
  };

  const isCompleted = (lessonId: string) => {
    if (!lessonHistory) return false;
    if (Array.isArray(lessonHistory)) {
      return lessonHistory.includes(lessonId);
    }
    const lessonRecord = lessonHistory[lessonId];
    return (
      !!lessonRecord &&
      lessonRecord.markedAsComplete &&
      (lessonRecord?.type ? lessonRecord.type == currentLesson.type : true)
    );
  };
  // Reusable rendering for topics
  const renderTopic = (topic: Topic) => {
    const [isExpanded, setIsExpanded] = useState(
      topic.items.some((item) => isLessonActive(item.id))
    );

    return (
      <Collapsible
        key={topic.id}
        open={isExpanded}
        onOpenChange={() => setIsExpanded((prev) => !prev)}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-3 h-auto text-left hover:bg-muted/50 transition-colors whitespace-normal items-start"
          >
            <div className="flex items-start gap-3 no-scrollbar .no-scrollbar::-webkit-scrollbar ">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground text-wrap whitespace-normal break-words leading-snug">
                  {topic.title}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {topic.items?.length || 0} lessons
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-1 mt-1">
          {topic.items?.map((lessonItem: TopicItem) => (
            <Link
              key={lessonItem.id}
              to={`/courses/${course.slug ? course.slug : course.id}/lesson/${lessonItem.id}`}
              className={cn(
                "max-w-full block ml-6 p-3 rounded-lg border border-transparent transition-all duration-200",
                isLessonActive(lessonItem.id) && [
                  "bg-primary/5 border-primary/20 shadow-sm",
                  "ring-1 ring-primary/10",
                ],
                "hover:bg-muted/30 hover:border-border"
              )}
              onClick={() =>
                onLessonClick({
                  id: lessonItem.id,
                  type: lessonItem.type,
                  title: lessonItem.title,
                })
              }
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded text-xs  text-muted-foreground",
                    isLessonActive(lessonItem.id) && " text-primary-foreground "
                  )}
                >
                  {lessonItem.type === "LESSON" ? (
                    <BookOpen className="text-pink-500" />
                  ) : (
                    <NotepadText className="text-blue-500" />
                  )}
                </div>

                {/* Lesson title */}
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm font-medium whitespace-normal break-words leading-snug",
                      isLessonActive(lessonItem.id) ? "text-primary" : "text-foreground"
                    )}
                  >
                    {lessonItem.title}
                  </div>
                </div>
                <div
                  className={`w-5 h-5 flex items-center justify-center border rounded-full self-start ${
                    isCompleted(lessonItem.id) ? "bg-primary" : "bg-transparent"
                  }`}
                >
                  {isCompleted(lessonItem.id) && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </Link>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div
      className={cn("w-80 h-full border-r bg-card/50 backdrop-blur-sm flex flex-col", className)}
    >
      <div className="flex-1  py-4 mr-2">
        <div className="">
          {/* === Top-level course topics === */}
          {course.topics?.length > 0 && (
            <div className="">{course.topics.map((topic) => renderTopic(topic))}</div>
          )}
        </div>
      </div>
    </div>
  );
}
