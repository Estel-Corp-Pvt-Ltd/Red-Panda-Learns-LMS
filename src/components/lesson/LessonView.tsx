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
import ReactMarkdown from "react-markdown";

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

  const getLessonContent = () => {
    switch (lesson.type) {
      case LESSON_TYPE.SLIDE_DECK:
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
      <ReactMarkdown
        components={{
          h2: ({ children }) => (
            <>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1 mt-5">
                {children}
              </h2>
              <hr className="my-2 mb-4 border-gray-300 dark:border-gray-600" />
            </>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-4">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 text-gray-600 dark:text-gray-400 leading-relaxed">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 mb-3 ml-3 space-y-0.5">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="text-gray-600 dark:text-gray-400 text-sm">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-medium text-gray-800 dark:text-gray-200">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-700 dark:text-gray-400">
              {children}
            </em>
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt || "Markdown image"}
              className="my-6 mb-8 rounded-lg max-w-full min-h-72 h-auto m-auto"
            />
          ),
          code: ({ children }) => (
            <div className="my-6 mb-8 rounded-lg max-w-full h-auto p-4 bg-gray-900 text-gray-100 overflow-x-auto">
              <code className="text-gray-100 px-1 rounded font-mono">
                {children}
              </code>
            </div>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary underline hover:text-primary/80 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {lesson.description || '_No content provided._'}
      </ReactMarkdown>

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
