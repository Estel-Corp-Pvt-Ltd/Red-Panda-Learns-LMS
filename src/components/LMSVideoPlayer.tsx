import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2, ExternalLink } from "lucide-react";

type LmsVideoPlayerProps = {
    url: string; // YouTube/Vimeo URL or direct .mp4/.m3u8
    title?: string;
    playing?: boolean;
    controls?: boolean;
    onEnded?: () => void;
    className?: string;
};

export default function LmsVideoPlayer({
    url,
    title = "Video Player",
    playing = false,
    controls = true,
    onEnded,
    className = "",
}: LmsVideoPlayerProps) {
    const [showEndOverlay, setShowEndOverlay] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const playerRef = useRef<HTMLDivElement>(null);

    // Extract video ID and determine platform
    const getVideoInfo = (url: string) => {
        try {
            // YouTube patterns
            if (url.includes("youtube.com") || url.includes("youtu.be")) {
                let videoId = "";

                // Standard YouTube URL
                const youtubeMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                if (youtubeMatch && youtubeMatch[1]) {
                    videoId = youtubeMatch[1];
                }

                return {
                    type: "youtube" as const,
                    id: videoId,
                    embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=${playing ? 1 : 0}&controls=${controls ? 1 : 0}&modestbranding=1&playsinline=1&rel=0&enablejsapi=1`,
                };
            }

            // Vimeo patterns
            if (url.includes("vimeo.com")) {
                const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/);
                if (vimeoMatch && vimeoMatch[1]) {
                    return {
                        type: "vimeo" as const,
                        id: vimeoMatch[1],
                        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=${playing ? 1 : 0}&controls=${controls ? 1 : 0}&title=0&byline=0&portrait=0`,
                    };
                }
            }

            // Direct video files
            if (url.match(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i)) {
                return {
                    type: "direct" as const,
                    id: null,
                    embedUrl: url,
                };
            }

            throw new Error("Unsupported video URL");
        } catch (err) {
            setError("Invalid video URL format");
            return { type: "error" as const, id: null, embedUrl: "" };
        }
    };

    const videoInfo = getVideoInfo(url);

    // Handle play/pause based on prop changes
    useEffect(() => {
        if (!playerRef.current || videoInfo.type === "error") return;

        const iframe = playerRef.current.querySelector("iframe");
        if (!iframe || !iframe.contentWindow) return;

        const sendMessage = (message: any) => {
            iframe.contentWindow?.postMessage(JSON.stringify(message), "*");
        };

        if (videoInfo.type === "youtube") {
            if (playing) {
                sendMessage({ event: "command", func: "playVideo", args: "" });
            } else {
                sendMessage({ event: "command", func: "pauseVideo", args: "" });
            }
        } else if (videoInfo.type === "vimeo") {
            if (playing) {
                sendMessage({ method: "play" });
            } else {
                sendMessage({ method: "pause" });
            }
        }
    }, [playing, videoInfo.type]);

    // Handle video ended event
    const handleVideoEnd = () => {
        setShowEndOverlay(true);
        onEnded?.();
    };

    // Setup message listeners for YouTube/Vimeo API
    useEffect(() => {
        if (videoInfo.type === "error") return;

        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);

                if (videoInfo.type === "youtube") {
                    if (data.event === "onStateChange") {
                        if (data.info === 0) { // Ended
                            handleVideoEnd();
                        } else if (data.info === 1) { // Playing
                            setHasStarted(true);
                            setIsLoading(false);
                        } else if (data.info === 3) { // Buffering
                            setIsLoading(true);
                        }
                    }
                } else if (videoInfo.type === "vimeo") {
                    if (data.event === "play") {
                        setHasStarted(true);
                        setIsLoading(false);
                    } else if (data.event === "pause") {
                        setIsLoading(false);
                    } else if (data.event === "ended") {
                        handleVideoEnd();
                    } else if (data.event === "bufferstart") {
                        setIsLoading(true);
                    } else if (data.event === "bufferend") {
                        setIsLoading(false);
                    }
                }
            } catch (e) {
                // Not a JSON message, ignore
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [videoInfo.type]);

    // Reset state when URL changes
    useEffect(() => {
        setShowEndOverlay(false);
        setHasStarted(false);
        setIsLoading(true);
        setError(null);
    }, [url]);

    const replayVideo = () => {
        setShowEndOverlay(false);
        setHasStarted(false);

        if (playerRef.current) {
            const iframe = playerRef.current.querySelector("iframe");
            if (!iframe || !iframe.contentWindow) return;

            if (videoInfo.type === "youtube") {
                iframe.contentWindow.postMessage(
                    JSON.stringify({ event: "command", func: "seekTo", args: [0, true] }),
                    "*"
                );
                iframe.contentWindow.postMessage(
                    JSON.stringify({ event: "command", func: "playVideo", args: "" }),
                    "*"
                );
            } else if (videoInfo.type === "vimeo") {
                iframe.contentWindow.postMessage(
                    JSON.stringify({ method: "setCurrentTime", value: 0 }),
                    "*"
                );
                iframe.contentWindow.postMessage(
                    JSON.stringify({ method: "play" }),
                    "*"
                );
            }
        }
    };

    if (videoInfo.type === "error" || error) {
        return (
            <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center ${className}`}>
                <div className="text-center p-6">
                    <div className="text-red-500 font-semibold mb-2">Error loading video</div>
                    <p className="text-sm text-gray-600 mb-4">{error || "Invalid video URL"}</p>
                    <Button
                        variant="outline"
                        onClick={() => window.open(url, "_blank")}
                        className="flex items-center gap-2"
                    >
                        <ExternalLink size={16} />
                        Open video link
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black ${className}`}>
            {/* Loading indicator */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
            )}

            {/* Play button overlay for initial state */}
            {!hasStarted && !isLoading && (
                <div
                    className="absolute inset-0 flex items-center justify-center z-10 bg-black/30 cursor-pointer"
                    onClick={() => {
                        setHasStarted(true);
                        if (playerRef.current) {
                            const iframe = playerRef.current.querySelector("iframe");
                            if (iframe && iframe.contentWindow) {
                                if (videoInfo.type === "youtube") {
                                    iframe.contentWindow.postMessage(
                                        JSON.stringify({ event: "command", func: "playVideo", args: "" }),
                                        "*"
                                    );
                                } else if (videoInfo.type === "vimeo") {
                                    iframe.contentWindow.postMessage(
                                        JSON.stringify({ method: "play" }),
                                        "*"
                                    );
                                }
                            }
                        }
                    }}
                >
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <div className="bg-red-600 rounded-full p-4 flex items-center justify-center">
                            <Play className="h-8 w-8 text-white fill-white ml-1" />
                        </div>
                    </div>
                </div>
            )}

            {/* The player itself */}
            <div
                ref={playerRef}
                className={`h-full w-full transition-opacity ${showEndOverlay ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            >
                {videoInfo.type === "direct" ? (
                    <video
                        className="h-full w-full object-contain"
                        controls={controls}
                        autoPlay={playing}
                        onEnded={handleVideoEnd}
                        onPlay={() => {
                            setHasStarted(true);
                            setIsLoading(false);
                        }}
                        onWaiting={() => setIsLoading(true)}
                        onCanPlay={() => setIsLoading(false)}
                    >
                        <source src={videoInfo.embedUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                ) : (
                    <iframe
                        src={videoInfo.embedUrl}
                        className="h-full w-full"
                        frameBorder="0"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        title={title}
                        onLoad={() => {
                            if (!hasStarted) setIsLoading(false);
                        }}
                    />
                )}
            </div>

            {/* Custom end screen (prevents platform recommendations) */}
            {showEndOverlay && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 text-white z-20">
                    <div className="text-center px-4">
                        <h3 className="text-xl font-semibold mb-2">{title ?? "Video complete"}</h3>
                        <p className="text-sm opacity-80">You can replay or continue.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="lg"
                            className="rounded-xl bg-white text-black hover:bg-white/90"
                            onClick={replayVideo}
                        >
                            Replay
                        </Button>
                        <Button
                            size="lg"
                            className="rounded-xl bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                                // e.g., navigate("/next-lesson");
                            }}
                        >
                            Next Lesson
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
