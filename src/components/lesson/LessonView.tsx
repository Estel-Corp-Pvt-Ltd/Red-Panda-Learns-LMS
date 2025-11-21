import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle, Video, FileText, Minimize2, Maximize2, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import VideoPlayer from "@/components/VideoPlayer";
import { Lesson, LessonAttachment } from "@/types/lesson";
import { LESSON_TYPE } from "@/constants";
import { toast } from "@/hooks/use-toast";
import { lessonService } from "@/services/lessonService";
import { logError } from "@/utils/logger";
import { LoadingSkeleton } from "../ui/loading-skeleton";
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
  const [attachments, setAttachments] = useState<LessonAttachment[]>([]);

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

    const fetchLessonAttachments = async () => {
      try {
        if (!lessonId) return;
        const attachments = await lessonService.getAttachmentsByLessonId(lessonId);
        setAttachments(attachments);
      } catch (error) {
        logError("fetchLessonAttachments", error);
      }
    };

    if (lessonId) {
      fetchLesson();
      fetchLessonAttachments();
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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
      case LESSON_TYPE.PDF:
        if (isValidHttpUrl(lesson.embedUrl))
          return (
            <iframe
              src={lesson.embedUrl}
              className="border-0 w-full min-h-[500px]"
              allowFullScreen
              loading="lazy">
            </iframe>
          );
        return (
          <div
            className="prose prose-sm max-w-none dark:prose-invert leading-relaxed w-full section-with-iframe"
            dangerouslySetInnerHTML={{ __html: lesson.embedUrl }}
          />
        );
      case LESSON_TYPE.VIDEO_LECTURE:
        return <VideoPlayer url={lesson.embedUrl} />;
      default:
        // console.log("lesson.embedUrl", lesson.embedUrl);
        return lesson.embedUrl ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert leading-relaxed w-full"
            dangerouslySetInnerHTML={{ __html: lesson.embedUrl }}
          />
        ) : null;
    }
  };

  return (
    <div className={`relative bg-white dark:bg-background space-y-6 mx-auto ${isFullscreen ? 'p-10 overflow-y-scroll' : ''}`} ref={containerRef}>
      <div className="flex items-start justify-between gap-4 w-full">
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

        {completed ? (
          <Button
            variant="default"
            size="sm"
            disabled
            className="cursor-default bg-green-600 text-white hover:bg-green-600"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Completed
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handleMarkComplete}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Complete
          </Button>
        )}
        <Button onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </Button>
      </div>

      {/* Lesson Content */}
      <div className="w-full" >
        {getLessonContent()}
      </div>
      {/* Progress Indicator */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Lesson Progress</span>
            <span className="text-sm text-muted-foreground">
              {completed ? "100% complete" : "0% complete"}
            </span>
          </div>
          <Progress value={completed ? 100 : 0} className="h-2" />
        </CardContent>
      </Card>
      {/* Lesson Description */}
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="md:w-2/3 bg-muted/30">
          <CardContent className="py-4">
            <h2 className="text-lg font-semibold mb-2">Lesson Description</h2>
            {lesson.description ? (
              <MarkdownViewer value={lesson.description} />
            ) : (
              <p className="text-sm text-muted-foreground">No description provided for this lesson.</p>
            )}
          </CardContent>
        </Card>
        <Card className="w-full md:w-1/3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Attachments</h2>
              <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {attachments.length} file{attachments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {attachments.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed rounded-lg">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No attachments for this lesson</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate" title={attachment.name}>
                          {attachment.name}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span className="capitalize">{attachment.type.toLowerCase()}</span>
                          <span>•</span>
                          <span>{formatFileSize(attachment.size)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        asChild
                      >
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={attachment.name}
                          title="Download file"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
