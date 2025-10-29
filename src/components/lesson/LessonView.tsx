import { useState, useEffect } from "react";
import { CheckCircle, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import VideoPlayer from "@/components/VideoPlayer";
import { Lesson } from "@/types/lesson";
import { LESSON_TYPE } from "@/constants";
import { toast } from "@/hooks/use-toast";
import { lessonService } from "@/services/lessonService";
import { logError } from "@/utils/logger";
import { LoadingSkeleton } from "../ui/loading-skeleton";
import MarkdownViewer from "../MarkdownViewer";

interface LessonViewProps {
  lessonId: string;
  onComplete: () => void;
}

export function LessonView({ lessonId, onComplete }: LessonViewProps) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const lessonData = await lessonService.getLessonById(lessonId);
        setLesson(lessonData);
      } catch (error) {
        logError("fetchLesson", error);
        setError("Failed to load lesson. Please try again.");
        toast({
          title: "Error",
          description: "Failed to load lesson content",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (lessonId) {
      fetchLesson();
    }
  }, [lessonId]);

  const handleMarkComplete = async () => {
    try {
      await onComplete();
      toast({
        title: "Success",
        description: "Lesson marked as completed!",
      });
    } catch (error) {
      console.error('Error marking lesson complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark lesson as complete",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !lesson) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {error || "Lesson not found"}
          </h3>
          <p className="text-muted-foreground">
            Please try refreshing the page or contact support.
          </p>
        </div>
      </div>
    );
  }

  const hasVideo = lesson.type === LESSON_TYPE.VIDEO_LECTURE;

  const isValidHttpUrl = (value: string): boolean => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const getLessonContent = () => {
    switch (lesson.type) {
      case LESSON_TYPE.SLIDE_DECK:
        if (isValidHttpUrl(lesson.embedUrl))
          return (
            <iframe
              src={lesson.embedUrl}
              width="100%"
              height="500"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy">
            </iframe>
          );
        return (
          <div
            className="prose prose-sm max-w-none dark:prose-invert leading-relaxed"
            dangerouslySetInnerHTML={{ __html: lesson.embedUrl }}
          />
        );
      case LESSON_TYPE.VIDEO_LECTURE:
        return <VideoPlayer url={lesson.embedUrl} />;
      default:
        return lesson.description ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert leading-relaxed"
            dangerouslySetInnerHTML={{ __html: lesson.description }}
          />
        ) : null;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {lesson.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {hasVideo ? (
              <>
                <Video className="h-4 w-4" />
                <span>Video Lesson</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>Lesson</span>
              </>
            )}
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleMarkComplete}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Mark Complete
        </Button>
      </div>

      {/* Lesson Content */}
      <div className="w-full">
        {getLessonContent()}
      </div>

      {/* Lesson Description */}
      <MarkdownViewer value={lesson.description || '_No content provided._'} />

      {/* Progress Indicator */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Lesson Progress</span>
            <span className="text-sm text-muted-foreground">
              0% complete
            </span>
          </div>
          <Progress value={0} className="h-2" />
        </CardContent>
      </Card>
    </div>
  );
}
