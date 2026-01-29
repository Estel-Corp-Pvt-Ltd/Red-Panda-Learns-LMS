import { useEffect, useRef, useState, useCallback } from "react";
import ZoomMtgEmbedded from "@zoom/meetingsdk/embedded";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  Loader2,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
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

// Size presets
const SIZE_PRESETS = {
  small: { width: 640, height: 360 },
  medium: { width: 800, height: 450 },
  large: { width: 1024, height: 576 },
  xlarge: { width: 1280, height: 720 },
};

type SizePreset = keyof typeof SIZE_PRESETS;

/**
 * ZoomMeeting Component - With Proper Resize Support
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
  const clientRef = useRef<ReturnType<typeof ZoomMtgEmbedded.createClient> | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState<MeetingStatus>("idle");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSize, setCurrentSize] = useState<SizePreset>("medium");
  const [dimensions, setDimensions] = useState(SIZE_PRESETS.medium);

  // Initialize Zoom client
  useEffect(() => {
    try {
      clientRef.current = ZoomMtgEmbedded.createClient();
      setIsReady(true);
      console.log("[ZoomMeeting] Client created");
    } catch (error) {
      console.error("[ZoomMeeting] Failed to create client:", error);
    }

    return () => {
      try {
        clientRef.current?.leaveMeeting();
      } catch {}
    };
  }, []);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      const nowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(nowFullscreen);
      onToggleFullscreen?.(nowFullscreen);

      // Resize Zoom when fullscreen changes
      if (clientRef.current && status === "joined") {
        const newWidth = nowFullscreen ? window.innerWidth : dimensions.width;
        const newHeight = nowFullscreen ? window.innerHeight - 60 : dimensions.height;
        resizeZoom(newWidth, newHeight);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [onToggleFullscreen, status, dimensions]);

  /**
   * THE KEY FUNCTION: Resize Zoom SDK
   *
   * Uses the SDK's internal methods to actually resize the video
   */
  const resizeZoom = useCallback(
    (width: number, height: number) => {
      const client = clientRef.current;
      if (!client || status !== "joined") {
        console.warn("[ZoomMeeting] Cannot resize - not in meeting");
        return;
      }

      try {
        console.log(`[ZoomMeeting] Resizing Zoom to ${width}x${height}`);

        // Method 1: Use the embedded client's resize method
        // @ts-ignore - SDK internal method
        const embeddedClient = client as any;

        // Try different SDK methods
        if (embeddedClient.resize) {
          embeddedClient.resize(width, height);
          console.log("[ZoomMeeting] Used resize()");
        }

        // Method 2: Update video options
        if (embeddedClient.updateVideoOptions) {
          embeddedClient.updateVideoOptions({
            viewSizes: {
              default: { width, height },
            },
          });
          console.log("[ZoomMeeting] Used updateVideoOptions()");
        }

        // Method 3: Access internal embedded client
        if (embeddedClient._embeddedClient?.resize) {
          embeddedClient._embeddedClient.resize(width, height);
          console.log("[ZoomMeeting] Used _embeddedClient.resize()");
        }

        // Method 4: Use setVideoViewSize
        if (embeddedClient.setVideoViewSize) {
          embeddedClient.setVideoViewSize(width, height);
          console.log("[ZoomMeeting] Used setVideoViewSize()");
        }

        // Method 5: Find and update the actual video container
        const zoomRoot = meetingRef.current;
        if (zoomRoot) {
          // Find Zoom's internal containers
          const videoContainer = zoomRoot.querySelector(
            '[class*="video-container"]'
          ) as HTMLElement;
          const galleryContainer = zoomRoot.querySelector('[class*="gallery"]') as HTMLElement;
          const speakerContainer = zoomRoot.querySelector('[class*="speaker"]') as HTMLElement;

          [videoContainer, galleryContainer, speakerContainer].forEach((el) => {
            if (el) {
              el.style.width = `${width}px`;
              el.style.height = `${height}px`;
            }
          });

          // Also update the root container
          const zoomPaper = zoomRoot.querySelector(
            '[class*="zmwebsdk-MuiPaper-root"]'
          ) as HTMLElement;
          if (zoomPaper) {
            zoomPaper.style.width = `${width}px`;
            zoomPaper.style.height = `${height}px`;
          }
        }

        // Method 6: Trigger window resize
        window.dispatchEvent(new Event("resize"));

        // Method 7: Dispatch custom Zoom event
        window.dispatchEvent(
          new CustomEvent("zoom:resize", {
            detail: { width, height },
          })
        );

        setDimensions({ width, height });
      } catch (error) {
        console.error("[ZoomMeeting] Resize error:", error);
      }
    },
    [status]
  );

  /**
   * Change to preset size
   */
  const changeSize = useCallback(
    (preset: SizePreset) => {
      const { width, height } = SIZE_PRESETS[preset];
      setCurrentSize(preset);
      setDimensions({ width, height });
      resizeZoom(width, height);
    },
    [resizeZoom]
  );

  /**
   * Zoom in/out
   */
  const zoomIn = useCallback(() => {
    const newWidth = Math.min(Math.round(dimensions.width * 1.2), 1920);
    const newHeight = Math.min(Math.round(dimensions.height * 1.2), 1080);
    setDimensions({ width: newWidth, height: newHeight });
    resizeZoom(newWidth, newHeight);
  }, [dimensions, resizeZoom]);

  const zoomOut = useCallback(() => {
    const newWidth = Math.max(Math.round(dimensions.width * 0.8), 400);
    const newHeight = Math.max(Math.round(dimensions.height * 0.8), 225);
    setDimensions({ width: newWidth, height: newHeight });
    resizeZoom(newWidth, newHeight);
  }, [dimensions, resizeZoom]);

  /**
   * Join meeting
   */
  const handleJoin = useCallback(async () => {
    const client = clientRef.current;
    const container = meetingRef.current;

    if (!client || !container || status !== "idle") return;

    setStatus("joining");

    try {
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

      if (!res.ok) throw new Error("Failed to fetch signature");

      const { signature, sdkKey } = await res.json();

      // Initialize with current dimensions
      await client.init({
        zoomAppRoot: container,
        language: "en-US",
        patchJsMedia: true,
        leaveOnPageUnload: true,
        customize: {
          video: {
            defaultViewType: "gallery",
            isResizable: true,
            viewSizes: {
              default: {
                width: dimensions.width,
                height: dimensions.height,
              },
              ribbon: {
                width: 300,
                height: dimensions.height,
              },
            },
          },
          meetingInfo: ["topic", "host", "participant"],
        },
      });

      await client.join({
        sdkKey,
        signature,
        meetingNumber: zoomInfo.meetingId,
        password: zoomInfo.encryptedPasscode || zoomInfo.passcode || "",
        userName,
        userEmail,
      });

      setStatus("joined");

      client.on("connection-change", (payload: any) => {
        if (payload.state === "Closed") {
          setStatus("idle");
          onMeetingEnd?.();
        }
      });
    } catch (error: any) {
      console.error("[ZoomMeeting] Join failed:", error);
      setStatus("idle");
      toast({
        title: "Zoom Error",
        description: error?.reason || error?.message || "Failed to join",
        variant: "destructive",
      });
    }
  }, [status, zoomInfo, userId, userName, userEmail, dimensions, onMeetingEnd]);

  /**
   * Leave meeting
   */
  const handleLeave = useCallback(async () => {
    try {
      await clientRef.current?.leaveMeeting();
    } catch {}
    setStatus("idle");
    onMeetingEnd?.();
  }, [onMeetingEnd]);

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = useCallback(async () => {
    try {
      if (isFullscreen) {
        await document.exitFullscreen();
      } else if (containerRef.current) {
        await containerRef.current.requestFullscreen();
      }
    } catch (error) {
      console.warn("[ZoomMeeting] Fullscreen error:", error);
    }
  }, [isFullscreen]);

  return (
    <>
      <style>{`
        /* Force Zoom SDK to respect container size */
        #zoom-meeting-sdk {
          width: 100% !important;
          height: 100% !important;
        }

        #zoom-meeting-sdk > div {
          width: 100% !important;
          height: 100% !important;
        }

        /* Target Zoom's MUI Paper root */
        #zoom-meeting-sdk [class*="zmwebsdk-MuiPaper-root"] {
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          max-height: none !important;
        }

        /* Video containers */
        #zoom-meeting-sdk [class*="video-container"],
        #zoom-meeting-sdk [class*="gallery-video-container"],
        #zoom-meeting-sdk [class*="speaker-view"],
        #zoom-meeting-sdk [class*="active-speaker"] {
          width: 100% !important;
          height: calc(100% - 50px) !important; /* Leave room for toolbar */
        }

        /* Toolbar */
        #zoom-meeting-sdk [class*="zmwebsdk"][class*="footer"],
        #zoom-meeting-sdk [class*="zmwebsdk"][class*="toolbar"] {
          width: 100% !important;
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          z-index: 9999 !important;
        }

        /* Z-index fixes */
        [class*="zmwebsdk-MuiPopover"],
        [class*="zmwebsdk-MuiModal"],
        [class*="zmwebsdk-MuiDialog"],
        [class*="zmwebsdk-MuiMenu"] {
          z-index: 99999 !important;
        }

        [class*="zmwebsdk"] button,
        [class*="zmwebsdk"] [role="button"] {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
      `}</style>

      <div
        ref={containerRef}
        className={`w-full ${isFullscreen ? "bg-black fixed inset-0 z-50" : ""}`}
      >
        <Card className={`w-full ${isFullscreen ? "rounded-none border-0 bg-black h-full" : ""}`}>
          {/* Header */}
          <CardHeader
            className={`flex flex-row items-center justify-between py-2 px-4 border-b ${
              isFullscreen ? "bg-black/90 text-white sticky top-0 z-20" : ""
            }`}
          >
            <CardTitle className="flex items-center gap-2 text-sm">
              <Video className={`h-4 w-4 ${isFullscreen ? "text-white" : "text-primary"}`} />
              <span className="hidden sm:inline">Live Session</span>
              <span
                className={`text-xs ml-2 ${isFullscreen ? "text-gray-300" : "text-muted-foreground"}`}
              >
                <Clock className="h-3 w-3 inline mr-1" />
                {formatDateTime(zoomInfo.startTime)}
              </span>
            </CardTitle>

            {status === "joined" && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Size Controls */}
                <div
                  className={`flex items-center gap-1 p-1 rounded-lg ${isFullscreen ? "bg-white/10" : "bg-muted"}`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomOut}
                    className={`h-7 w-7 p-0 ${isFullscreen ? "text-white/70 hover:text-white" : ""}`}
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>

                  {(["small", "medium", "large", "xlarge"] as SizePreset[]).map((preset) => (
                    <Button
                      key={preset}
                      variant={currentSize === preset ? "default" : "ghost"}
                      size="sm"
                      onClick={() => changeSize(preset)}
                      className={`h-7 w-7 p-0 text-xs ${
                        currentSize !== preset && isFullscreen
                          ? "text-white/70 hover:text-white"
                          : ""
                      }`}
                    >
                      {preset[0].toUpperCase()}
                    </Button>
                  ))}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomIn}
                    className={`h-7 w-7 p-0 ${isFullscreen ? "text-white/70 hover:text-white" : ""}`}
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>

                  <span
                    className={`text-xs px-1.5 ${isFullscreen ? "text-white/50" : "text-muted-foreground"}`}
                  >
                    {dimensions.width}×{dimensions.height}
                  </span>
                </div>

                {/* Fullscreen */}
                <Button
                  variant={isFullscreen ? "secondary" : "outline"}
                  size="sm"
                  onClick={toggleFullscreen}
                  className="h-7"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </Button>

                {/* Leave */}
                <Button variant="destructive" size="sm" onClick={handleLeave} className="h-7">
                  <VideoOff className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardHeader>

          {/* Content */}
          <CardContent className={`${isFullscreen ? "p-0 h-[calc(100%-60px)]" : "p-4"}`}>
            <div
              className={`relative bg-black mx-auto overflow-hidden ${isFullscreen ? "h-full" : "rounded-lg"}`}
              style={{
                width: isFullscreen ? "100%" : dimensions.width,
                height: isFullscreen ? "100%" : dimensions.height,
                transition: "width 0.2s, height 0.2s",
              }}
            >
              {/* Zoom SDK Container */}
              <div
                ref={meetingRef}
                id="zoom-meeting-sdk"
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#000",
                }}
              />

              {/* Pre-join Overlay */}
              {status !== "joined" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                  {status === "idle" ? (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                        <Video className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Ready to join?</h3>
                      <Button size="lg" onClick={handleJoin} disabled={!isReady}>
                        {!isReady ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Initializing...
                          </>
                        ) : (
                          <>
                            <Video className="h-4 w-4 mr-2" />
                            Join Session
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-white">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p>Connecting...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
