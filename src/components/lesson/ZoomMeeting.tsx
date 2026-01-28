import { useEffect, useRef, useState, useCallback } from "react";
import ZoomMtgEmbedded from "@zoom/meetingsdk/embedded";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Loader2, Video, VideoOff, Maximize2, Minimize2 } from "lucide-react";
import { ZoomInfo } from "@/types/lesson";
import { toast } from "@/hooks/use-toast";
import { BACKEND_URL } from "@/config";
import { authService } from "@/services/authService";
import { formatDateTime } from "@/utils/date-time";

interface ZoomMeetingProps {
  zoomInfo: ZoomInfo;
  userId: string;
  userName: string;
  userEmail?: string;
  onMeetingEnd?: () => void;
  onToggleFullscreen?: (isFullscreen: boolean) => void;
}

type MeetingStatus = "idle" | "joining" | "joined";

interface ContainerSize {
  width: number;
  height: number;
}

/**
 * Hook: useZoomClient
 */
function useZoomClient(
  containerRef: React.RefObject<HTMLDivElement>,
  containerSize: ContainerSize
) {
  const clientRef = useRef<ReturnType<typeof ZoomMtgEmbedded.createClient> | null>(null);

  useEffect(() => {
    try {
      clientRef.current = ZoomMtgEmbedded.createClient();
      console.log("[useZoomClient] Zoom client created successfully");
    } catch (error) {
      console.error("[useZoomClient] Failed to create Zoom client:", error);
    }
    return () => {
      try {
        clientRef.current?.leaveMeeting();
      } catch {}
    };
  }, []);

  const updateVideoSize = useCallback(async () => {
    if (!clientRef.current) return;

    if (containerSize.width === 0 || containerSize.height === 0) return;

    try {
      const client = clientRef.current;

      const videoWidth = containerSize.width;
      const videoHeight = containerSize.height;

      console.log("[useZoomClient] Updating video size:", {
        videoWidth,
        videoHeight,
      });

      await client.updateVideoOptions({
        viewSizes: {
          default: {
            width: Math.floor(videoWidth),
            height: Math.floor(videoHeight),
          },
        },
      });
    } catch (error) {
      console.warn("[useZoomClient] Failed to update video size:", error);
    }
  }, [containerSize]);

  return {
    client: clientRef.current,
    updateVideoSize,
  };
}

/**
 * Hook: useContainerSize
 */
function useContainerSize(containerRef: React.RefObject<HTMLDivElement>) {
  const [size, setSize] = useState<ContainerSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setSize({
      width: container.clientWidth,
      height: container.clientHeight,
    });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        console.log("[useContainerSize] Container resized:", { width, height });
        setSize({ width, height });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return size;
}

/**
 * Hook: useFullscreenSync
 */
function useFullscreenSync(
  containerRef: React.RefObject<HTMLDivElement>,
  onToggleFullscreen?: (isFullscreen: boolean) => void,
  onUpdateVideoSize?: () => Promise<void>
) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const nowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(nowFullscreen);
      onToggleFullscreen?.(nowFullscreen);

      setTimeout(() => {
        onUpdateVideoSize?.();
      }, 100);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [onToggleFullscreen, onUpdateVideoSize]);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!containerRef.current) return;

      const element = containerRef.current as any;

      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
    } catch (error) {
      console.warn("[useFullscreenSync] Failed to enter fullscreen:", error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      const doc = document as any;

      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    } catch (error) {
      console.warn("[useFullscreenSync] Failed to exit fullscreen:", error);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return { isFullscreen, toggle };
}

/**
 * Hook: useZoomLifecycle
 */
function useZoomLifecycle(
  zoomInfo: ZoomInfo,
  userId: string,
  userName: string,
  userEmail: string,
  client: ReturnType<typeof ZoomMtgEmbedded.createClient> | null,
  meetingContainer: HTMLDivElement | null,
  onMeetingEnd?: () => void,
  onUpdateVideoSize?: () => Promise<void>
) {
  const [status, setStatus] = useState<MeetingStatus>("idle");

  const fetchSignature = useCallback(async (): Promise<{ signature: string; sdkKey: string }> => {
    const token = await authService.getToken();

    const res = await fetch(`${BACKEND_URL}/generateZoomMeetingSignature`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        meetingNumber: zoomInfo.meetingId,
        userId,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch signature: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log("[useZoomLifecycle] Signature fetched successfully");
    return data;
  }, [zoomInfo.meetingId, userId]);

  const initializeClient = useCallback(
    async (containerElement: HTMLDivElement) => {
      if (!client) {
        throw new Error("Zoom client not initialized");
      }

      console.log("[useZoomLifecycle] Initializing Zoom client");

      await client.init({
        zoomAppRoot: containerElement,
        language: "en-US",
        patchJsMedia: true,
        leaveOnPageUnload: true,
        customize: {
          video: {
            isResizable: false,
            popper: {
              disableDraggable: true,
            },
            viewSizes: {
              default: {
                width: containerElement.clientWidth,
                height: containerElement.clientHeight,
              },
            },
          },
          meetingInfo: ["topic", "host", "mn", "pwd", "invite", "participant"] as const,
        },
      });

      console.log("[useZoomLifecycle] Client initialized successfully");
    },
    [client]
  );

  const join = useCallback(
    async (meetingElement: HTMLDivElement) => {
      if (status !== "idle") {
        console.warn("[useZoomLifecycle] Join called but status is not idle:", status);
        return;
      }

      if (!meetingElement) {
        console.error("[useZoomLifecycle] Meeting element is null");
        return;
      }

      setStatus("joining");

      try {
        console.log("[useZoomLifecycle] Starting join process");
        console.log("[useZoomLifecycle] Meeting element:", meetingElement);

        const { signature, sdkKey } = await fetchSignature();

        await initializeClient(meetingElement);

        console.log("[useZoomLifecycle] Joining meeting with ID:", zoomInfo.meetingId);
        await client?.join({
          sdkKey,
          signature,
          meetingNumber: zoomInfo.meetingId,
          password: zoomInfo.encryptedPasscode || zoomInfo.passcode || "",
          userName,
          userEmail,
        });

        console.log("[useZoomLifecycle] Successfully joined meeting");
        setStatus("joined");

        await onUpdateVideoSize?.();

        client?.on("connection-change", (payload: any) => {
          console.log("[useZoomLifecycle] Connection status changed:", payload);
          if (payload.state === "Closed") {
            setStatus("idle");
            onMeetingEnd?.();
          }
        });
      } catch (error: any) {
        console.error("[useZoomLifecycle] Failed to join meeting:", error);
        setStatus("idle");

        let errorMessage = "Failed to join meeting";
        if (error?.reason) {
          errorMessage = error.reason;
        } else if (error?.type === "INVALID_SIGNATURE") {
          errorMessage = "Invalid signature. Check your credentials.";
        } else if (error?.errorCode === 3712) {
          errorMessage = "Meeting not started or already ended.";
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        toast({
          title: "Zoom Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [
      client,
      status,
      zoomInfo.meetingId,
      zoomInfo.encryptedPasscode,
      zoomInfo.passcode,
      userName,
      userEmail,
      fetchSignature,
      initializeClient,
      onUpdateVideoSize,
      onMeetingEnd,
    ]
  );

  const leave = useCallback(async () => {
    try {
      console.log("[useZoomLifecycle] Leaving meeting");
      await client?.leaveMeeting();
      setStatus("idle");
      onMeetingEnd?.();
    } catch (error) {
      console.error("[useZoomLifecycle] Error leaving meeting:", error);
      setStatus("idle");
    }
  }, [client, onMeetingEnd]);

  return {
    status,
    join,
    leave,
  };
}

/**
 * ZoomMeeting Component
 */
export function ZoomMeeting({
  zoomInfo,
  userId,
  userName,
  userEmail = "",
  onMeetingEnd,
  onToggleFullscreen,
}: ZoomMeetingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const meetingRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const containerSize = useContainerSize(videoWrapperRef);

  const { client, updateVideoSize } = useZoomClient(containerRef, containerSize);

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreenSync(
    containerRef,
    onToggleFullscreen,
    updateVideoSize
  );

  const { status, join, leave } = useZoomLifecycle(
    zoomInfo,
    userId,
    userName,
    userEmail,
    client,
    null,
    onMeetingEnd,
    updateVideoSize
  );

  const handleJoin = useCallback(() => {
    if (!meetingRef.current) {
      console.error("[ZoomMeeting] Meeting container not found");
      return;
    }
    console.log("[ZoomMeeting] handleJoin - container found, calling join");
    join(meetingRef.current);
  }, [join]);

  useEffect(() => {
    if (status === "joined" && containerSize.width > 0) {
      updateVideoSize();
    }
  }, [containerSize, status, updateVideoSize]);

  // Scroll to top when entering fullscreen
  useEffect(() => {
    if (isFullscreen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [isFullscreen]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${isFullscreen ? "bg-black fixed inset-0 z-50" : ""}`}
    >
      {/* Scrollable wrapper - this is the key fix */}
      <div
        ref={scrollContainerRef}
        className="w-full"
        style={{
          height: isFullscreen ? "100vh" : "auto",
          maxHeight: isFullscreen ? "100vh" : "calc(100vh - 100px)",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <Card
          className={`w-full ${isFullscreen ? "rounded-none border-0 bg-black min-h-full" : "overflow-visible"}`}
        >
          {/* Header: Title and Controls - Always sticky */}
          <CardHeader
            className={`flex flex-row items-center justify-between py-3 px-4 sticky top-0 z-20 border-b ${
              isFullscreen ? "bg-black/95 text-white backdrop-blur-sm" : "bg-background"
            }`}
          >
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Video
                className={`h-4 w-4 md:h-5 md:w-5 ${isFullscreen ? "text-white" : "text-primary"}`}
              />
              <span className="hidden sm:inline">Live Session</span>
              <span
                className={`text-xs md:text-sm flex items-center gap-1 ml-2 ${
                  isFullscreen ? "text-gray-300" : "text-muted-foreground"
                }`}
              >
                <Clock className="h-3 w-3" />
                {formatDateTime(zoomInfo.startTime)}
              </span>
            </CardTitle>

            {status === "joined" && (
              <div className="flex items-center gap-2">
                <Button
                  variant={isFullscreen ? "secondary" : "outline"}
                  size="sm"
                  onClick={toggleFullscreen}
                  className="h-8"
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Exit Fullscreen</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Fullscreen</span>
                    </>
                  )}
                </Button>
                <Button variant="destructive" size="sm" onClick={leave} className="h-8">
                  <VideoOff className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Leave</span>
                </Button>
              </div>
            )}
          </CardHeader>

          {/* Content Area */}
          <CardContent className={`${isFullscreen ? "p-0" : "p-2 md:p-4"}`}>
            {/* Meeting Container */}
            <div className={`w-full ${status === "joined" ? "block" : "hidden"}`}>
              <div
                ref={videoWrapperRef}
                className={`relative bg-black w-full ${isFullscreen ? "" : "rounded-lg"}`}
                style={{
                  // Make height larger than viewport in fullscreen to enable scrolling
                  height: isFullscreen ? "120vh" : "600px",
                  minHeight: isFullscreen ? "120vh" : "400px",
                }}
              >
                <div
                  ref={meetingRef}
                  className="w-full h-full"
                  style={{
                    backgroundColor: "#000",
                  }}
                />
              </div>

              {/* Extra padding at bottom for scroll */}
              <div
                style={{
                  height: isFullscreen ? "100px" : "16px",
                  backgroundColor: isFullscreen ? "#000" : "transparent",
                }}
              />
            </div>

            {/* Join Prompt - Shown before meeting is joined */}
            {status !== "joined" && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Ready to join?</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Click below to join the live session
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleJoin}
                  disabled={status === "joining"}
                  className="min-w-[200px]"
                >
                  {status === "joining" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Joining…
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      Join Session
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
