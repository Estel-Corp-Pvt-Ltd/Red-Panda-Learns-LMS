import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Course, TopicItem } from "@/types/course";

interface CourseNavigatorProps {
  course: Course;
  currentLesson: TopicItem | null;
  className?: string;
  onLessonClick: (lesson: TopicItem) => void;
}

export function CourseNavigator({
  course,
  currentLesson,
  className,
  onLessonClick
}: CourseNavigatorProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const params = useParams();

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const isLessonActive = (lessonId: string) => {
    return currentLesson && currentLesson.id === lessonId || params.lessonId === lessonId;
  };

  // Reusable rendering for topics
  const renderTopic = (topic: any) => (
    <Collapsible
      key={topic.id}
      open={expandedTopics.has(topic.id)}
      onOpenChange={() => toggleTopic(topic.id)}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-foreground text-wrap">{topic.title}</div>
              <div className="text-xs text-muted-foreground">{topic.items?.length || 0} lessons</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {expandedTopics.has(topic.id) ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-1 mt-1">
        {topic.items?.map((lessonItem: any, index: number) => (
          <Link
            key={lessonItem.id}
            to={`/course/${course.id}/lesson/${lessonItem.id}`}
            className={cn(
              "block ml-6 p-3 rounded-lg border border-transparent transition-all duration-200",
              isLessonActive(lessonItem.id) && [
                "bg-primary/5 border-primary/20 shadow-sm",
                "ring-1 ring-primary/10"
              ],
              "hover:bg-muted/30 hover:border-border"
            )}
            onClick={() => onLessonClick({
              id: lessonItem.id,
              type: lessonItem.type,
              title: lessonItem.title
            })}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-xs bg-muted text-muted-foreground",
                  isLessonActive(lessonItem.id) && "bg-primary text-primary-foreground"
                )}
              >
                <span>{index + 1}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className={cn("text-sm font-medium truncate", isLessonActive(lessonItem.id) ? "text-primary" : "text-foreground")}>
                  {lessonItem.title}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div className={cn("w-80 border-r bg-card/50 backdrop-blur-sm", className)}>
      <ScrollArea className="h-full p-4 overflow-y-scroll">
        <div className="space-y-6">

          {/* === Top-level course topics === */}
          {course.topics?.length > 0 && (
            <div className="space-y-2">
              {course.topics.map((topic) => renderTopic(topic))}
            </div>
          )}

          {/* === Cohort Topics === */}
          {course.cohorts?.length > 0 && course.cohorts.map((cohort, cohortIndex) => (
            <div key={`cohort-${cohortIndex}`} className="space-y-2">
              <div className="text-muted-foreground text-sm font-medium px-1">
                {cohort.title || `Cohort ${cohortIndex + 1}`}
              </div>
              {cohort.topics?.map((topic: any) => renderTopic(topic))}
            </div>
          ))}

        </div>
      </ScrollArea>
    </div>
  );
}
