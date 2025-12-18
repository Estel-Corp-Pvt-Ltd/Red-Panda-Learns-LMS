import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import VideoPlayer from "@/components/VideoPlayer";
import { LESSON_TYPE } from "@/constants";
import { toast } from "@/hooks/use-toast";
import { lessonService } from "@/services/lessonService";
import { Lesson, LessonAttachment } from "@/types/lesson";
import { logError } from "@/utils/logger";
import { CheckCircle, Download, FileText, Loader2, Maximize2, Minimize2, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import MarkdownViewer from "../MarkdownViewer";
import Comments from "./Comments";
import { learningProgressService } from "@/services/learningProgressService";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LessonViewProps {
  lessonId: string;
  onComplete: () => void;
  completed: boolean;
};

interface TimeTrackingState {
  startTime: number | null;
  totalTimeSpent: number;
  lastReportTime: number | null;
  isReporting: boolean;
  isActiveSession: boolean;
}

export function LessonView({ lessonId, onComplete, completed }: LessonViewProps) {
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [attachments, setAttachments] = useState<LessonAttachment[]>([]);

  // Time tracking state
  const timeTrackingRef = useRef<TimeTrackingState>({
    startTime: null,
    totalTimeSpent: 0,
    lastReportTime: null,
    isReporting: false,
    isActiveSession: true
  });

  // Inactivity monitoring
  const lastInteractionTimeRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showInactivityPrompt, setShowInactivityPrompt] = useState(false);
  const isTabActiveRef = useRef<boolean>(true);
  const isWindowVisibleRef = useRef<boolean>(true);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minute (for testing)
  const HEARTBEAT_INTERVAL = 60 * 1000; // Report time every 60 seconds
  const MIN_REPORT_TIME = 5; // Minimum 5 seconds to report
  const DEBOUNCE_INTERACTION = 500; // Debounce interactions to 500ms

  // Listen for fullscreen changes
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  // Enhanced time reporting with proper session management
  const reportTimeSpent = useCallback(async (forceReport: boolean = false, isSessionEnd: boolean = false) => {
    const state = timeTrackingRef.current;

    if (!state.startTime || !lessonId || !lesson || state.isReporting) {
      return 0;
    }

    // If session is not active, don't report (wait for next active session)
    if (!state.isActiveSession && !forceReport) {
      return 0;
    }

    const now = Date.now();
    const sessionTime = state.lastReportTime
      ? Math.floor((now - state.lastReportTime) / 1000)
      : Math.floor((now - state.startTime) / 1000);

    // Only count time if session is active
    const activeSessionTime = state.isActiveSession ? sessionTime : 0;
    const totalTimeToReport = state.totalTimeSpent + activeSessionTime;

    // Only report if enough time has passed or we're forcing a report
    if (!forceReport && totalTimeToReport < MIN_REPORT_TIME) {
      // Accumulate time for later reporting
      if (state.isActiveSession) {
        state.totalTimeSpent += activeSessionTime;
        state.lastReportTime = now;
      }
      return 0;
    }

    if (totalTimeToReport < 1 && !forceReport) {
      return 0;
    }

    state.isReporting = true;

    try {
      const courseId = lesson.courseId;
      await learningProgressService.timeSpentOnLesson(courseId, lessonId, totalTimeToReport);

      // Reset accumulated time
      state.totalTimeSpent = 0;
      state.lastReportTime = now;

      return totalTimeToReport;
    } catch (error) {
      logError("reportTimeSpent", error);
      // On error, keep the time to report later
      if (state.isActiveSession) {
        state.totalTimeSpent = totalTimeToReport;
      }
      return 0;
    } finally {
      state.isReporting = false;
    }
  }, [lessonId, lesson, user]);

  // Heartbeat reporting - only when session is active
  useEffect(() => {
    const startHeartbeat = () => {
      clearHeartbeat();
      heartbeatIntervalRef.current = setInterval(() => {
        if (timeTrackingRef.current.isActiveSession) {
          reportTimeSpent();
        }
      }, HEARTBEAT_INTERVAL);
    };

    const clearHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    if (lesson && user) {
      startHeartbeat();
    }

    return () => {
      clearHeartbeat();
    };
  }, [lesson, user, reportTimeSpent]);

  // Visibility and focus handlers - FIXED
  useEffect(() => {
    let isMounted = true;

    const handleVisibilityChange = () => {
      if (!isMounted) return;

      const isVisible = !document.hidden;
      isTabActiveRef.current = isVisible;

      if (isVisible) {
        // Tab became active - resume session
        timeTrackingRef.current.isActiveSession = true;
        lastInteractionTimeRef.current = Date.now();
        timeTrackingRef.current.lastReportTime = Date.now();
        resetInactivityTimer();
      } else {
        // Tab became inactive - pause session and report time
        timeTrackingRef.current.isActiveSession = false;
        reportTimeSpent(true, false);
        clearInactivityTimer();
      }
    };

    const handleWindowFocus = () => {
      if (!isMounted) return;

      isWindowVisibleRef.current = true;
      timeTrackingRef.current.isActiveSession = true;
      lastInteractionTimeRef.current = Date.now();
      resetInactivityTimer();
    };

    const handleWindowBlur = () => {
      if (!isMounted) return;

      isWindowVisibleRef.current = false;
      // Only pause if tab is also inactive
      if (!isTabActiveRef.current) {
        timeTrackingRef.current.isActiveSession = false;
        reportTimeSpent(true, false);
      }
      clearInactivityTimer();
    };

    const handlePageUnload = () => {
      // Force report on page unload with session end flag
      reportTimeSpent(true, true);
    };

    // Interaction handler with debouncing - FIXED
    let interactionDebounceTimer: NodeJS.Timeout | null = null;
    const handleUserInteraction = () => {
      if (!isMounted) return;

      // Clear any existing debounce timer
      if (interactionDebounceTimer) {
        clearTimeout(interactionDebounceTimer);
      }

      // Set new debounce timer
      interactionDebounceTimer = setTimeout(() => {
        lastInteractionTimeRef.current = Date.now();
        resetInactivityTimer();

        // Ensure session is active on interaction
        timeTrackingRef.current.isActiveSession = true;

        interactionDebounceTimer = null;
      }, DEBOUNCE_INTERACTION);
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handlePageUnload);
    window.addEventListener('beforeunload', handlePageUnload);

    // Add interaction listeners
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { passive: true });
    });

    // Initialize time tracking
    if (!timeTrackingRef.current.startTime) {
      timeTrackingRef.current.startTime = Date.now();
      timeTrackingRef.current.lastReportTime = Date.now();
      timeTrackingRef.current.isActiveSession = true;
    }

    return () => {
      isMounted = false;

      // Clean up timers
      if (interactionDebounceTimer) {
        clearTimeout(interactionDebounceTimer);
      }
      clearInactivityTimer();
      clearHeartbeat();

      // Clean up event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handlePageUnload);
      window.removeEventListener('beforeunload', handlePageUnload);

      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });

      // Final report on unmount
      reportTimeSpent(true, true);
    };
  }, [reportTimeSpent]);

  // Inactivity timer management - FIXED
  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  const clearHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const resetInactivityTimer = () => {
    clearInactivityTimer();

    if (isTabActiveRef.current && isWindowVisibleRef.current && timeTrackingRef.current.isActiveSession) {
      inactivityTimerRef.current = setTimeout(() => {
        // Check inactivity
        const currentTime = Date.now();
        const timeSinceLastInteraction = currentTime - lastInteractionTimeRef.current;

        if (timeSinceLastInteraction >= INACTIVITY_TIMEOUT) {
          setShowInactivityPrompt(true);
          // Pause session when showing inactivity prompt
          timeTrackingRef.current.isActiveSession = false;
          reportTimeSpent(true, false);
        }
      }, INACTIVITY_TIMEOUT);
    }
  };

  const handleInactivityPromptClose = () => {
    setShowInactivityPrompt(false);
    lastInteractionTimeRef.current = Date.now();
    // Resume session when user acknowledges prompt
    timeTrackingRef.current.isActiveSession = true;
    timeTrackingRef.current.lastReportTime = Date.now();
    resetInactivityTimer();
  };

  // Fetch lesson data
  useEffect(() => {
    const fetchLessonData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [lessonData, attachmentsData] = await Promise.all([
          lessonService.getLessonById(lessonId),
          lessonService.getAttachmentsByLessonId(lessonId)
        ]);

        setLesson(lessonData);
        setAttachments(attachmentsData);

        // Reset time tracking for new lesson
        timeTrackingRef.current = {
          startTime: Date.now(),
          totalTimeSpent: 0,
          lastReportTime: Date.now(),
          isReporting: false,
          isActiveSession: true
        };

        // Start inactivity timer
        lastInteractionTimeRef.current = Date.now();
        resetInactivityTimer();

      } catch (error) {
        logError("fetchLessonData", error);
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
      fetchLessonData();
    }

    // Cleanup on lesson change
    return () => {
      reportTimeSpent(true, true);
      clearInactivityTimer();
    };
  }, [lessonId]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      logError('Fullscreen error:', error);
    }
  }, []);

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

  const extractIframeSrc = (html: string): string | null => {
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
      case LESSON_TYPE.PDF:
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
        const srcFromHtml = extractIframeSrc(lesson.embedUrl);
        if (srcFromHtml) {
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
                allow="camera; microphone; accelerometer; gyroscope; magnetometer"
                className="w-full h-full block"
                style={{ border: 0 }}
                allowFullScreen
              />
            </div>
          );
        }

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

  const shouldHideDetails = isFullscreen;

  return (
    <>
      <div
        ref={containerRef}
        className={
          isFullscreen
            ? "fixed inset-0 z-50 flex flex-col bg-background p-0 m-0 overflow-hidden"
            : "relative bg-white dark:bg-background space-y-6 mx-auto"
        }
      >
        {/* Header */}
        <div className={`flex items-start justify-between gap-4 w-full ${isFullscreen ? 'p-4 border-b shrink-0' : ''}`}>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {lesson.title}
            </h1>
            {!isFullscreen && (
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
            )}
          </div>

          <div className="flex gap-2">
            {completed ? (
              <Button variant="default" size="sm" disabled className="cursor-default bg-green-600 text-white">
                <CheckCircle className="h-4 w-4 mr-2" /> Completed
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onComplete}>
                <CheckCircle className="h-4 w-4 mr-2" /> Mark Complete
              </Button>
            )}
            <Button onClick={toggleFullscreen} variant="outline" size="icon">
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>
          </div>
        </div>

        <div className={`w-full ${isFullscreen ? 'flex-1 h-full overflow-hidden' : ''}`}>
          {getLessonContent()}
        </div>

        {!shouldHideDetails && (
          <>
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
            <Comments lessonId={lesson.id} courseId={lesson.courseId} />
          </>
        )}
      </div>

      {/* Inactivity Prompt Dialog */}
      <AlertDialog open={showInactivityPrompt} onOpenChange={setShowInactivityPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you still there?</AlertDialogTitle>
            <AlertDialogDescription>
              It looks like you haven't interacted with the lesson for 1 minute.
              Your learning progress has been saved. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleInactivityPromptClose}>
              Continue Learning
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleInactivityPromptClose}>
              Yes, I'm Back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
