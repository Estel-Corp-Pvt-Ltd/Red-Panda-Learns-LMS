import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import VideoPlayer from "@/components/VideoPlayer";
import { LESSON_TYPE } from "@/constants";
import { toast } from "@/hooks/use-toast";
import { lessonService } from "@/services/lessonService";
import { Lesson } from "@/types/lesson";
import { logError } from "@/utils/logger";
import { CheckCircle, FileText, Loader2, Maximize2, Minimize2, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import MarkdownViewer from "../MarkdownViewer";

interface LessonViewProps {
  lessonId: string;
  onComplete: () => void;
  completed: boolean;
}

export function LessonView({ lessonId, onComplete, completed }: LessonViewProps) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

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

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, []);

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
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="animate-spin mx-auto mt-20 text-muted-foreground" size={50} />
      </div>
    );
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


  const extractIframeSrc = (html: string): string | null => {
  // Very simple regex to grab src="...".
  const match = html.match(/src="([^"]+)"/);
  return match ? match[1] : null;
};

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
              style={{ border: 0, width: '100%', height: isFullscreen ? '100%' : '500px' }}
              allowFullScreen
              loading="lazy"
            />
          );
        return (
          <div
            className="prose prose-sm max-w-none dark:prose-invert leading-relaxed w-full section-with-iframe"
            dangerouslySetInnerHTML={{ __html: lesson.embedUrl }}
          />
        );

   case LESSON_TYPE.INTERACTIVE_PROJECT: {
  // Try to treat embedUrl as HTML that contains an <iframe>
  const srcFromHtml = extractIframeSrc(lesson.embedUrl);

  if (srcFromHtml) {
    // We control sizing here, ignoring width/height in the original HTML
    return (
      <div
        className={
          isFullscreen
            ? "w-full h-full bg-neutral-900"
            : "w-full h-[600px] bg-muted"
        }
      >
        <iframe
          src={srcFromHtml}
          className="w-full h-full block"
          style={{ border: 0 }}
          allowFullScreen
        />
      </div>
    );
  }

  // Fallback: if we couldn't parse src, just render raw HTML
  return (
    <div
      className={
        isFullscreen
          ? "w-full h-full overflow-auto flex items-center justify-center bg-neutral-900"
          : "w-full flex items-center justify-center bg-muted"
      }
    >
      <div className="w-full h-full max-w-6xl max-h-[80vh]">
        <div
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: lesson.embedUrl }}
        />
      </div>
    </div>
  );
}

      case LESSON_TYPE.VIDEO_LECTURE:
        return <VideoPlayer url={lesson.embedUrl} />;

      default:
        return lesson.embedUrl ? (
          <div className={isFullscreen ? "w-full h-full overflow-auto" : "w-full"}>
            <div
              className="prose prose-sm max-w-none dark:prose-invert leading-relaxed w-full"
              dangerouslySetInnerHTML={{ __html: lesson.embedUrl }}
            />
          </div>
        ) : null;
    }
  };

  return (
    <div
      ref={containerRef}
      // FIX: Ensure fullscreen container takes full viewport
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-background p-0 m-0 overflow-hidden"
          : "relative bg-white dark:bg-background space-y-6 mx-auto"
      }
    >
      {/* Header */}
      <div className={`flex items-start justify-between gap-4 w-full ${isFullscreen ? 'p-4 border-b' : ''}`}>
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

        <div className="flex gap-2">
          {completed ? (
            <Button variant="default" size="sm" disabled className="cursor-default bg-green-600 text-white">
              <CheckCircle className="h-4 w-4 mr-2" /> Completed
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleMarkComplete}>
              <CheckCircle className="h-4 w-4 mr-2" /> Mark Complete
            </Button>
          )}
          <Button onClick={toggleFullscreen} variant="outline" size="icon">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </Button>
        </div>
      </div>

      {/* Content Wrapper: Use flex-1 only when in fullscreen */}
      <div className={`w-full ${isFullscreen ? 'flex-1' : ''}`}>
        {getLessonContent()}
      </div>

      {/* Footer */}
      {!isFullscreen && (
        <>
          {lesson.description && <MarkdownViewer value={lesson.description} />}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Lesson Progress</span>
                <span className="text-sm text-muted-foreground">{completed ? "100%" : "0%"}</span>
              </div>
              <Progress value={completed ? 100 : 0} className="h-2" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}