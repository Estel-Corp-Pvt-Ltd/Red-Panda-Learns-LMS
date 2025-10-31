import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Play, ExternalLink } from "lucide-react";
import Plyr from "plyr-react";
import "plyr-react/plyr.css";

type LmsVideoPlayerProps = {
    url: string;
    title?: string;
    playing?: boolean;
    onEnded?: () => void;
    className?: string;
};

export default function VideoPlayer({
    url,
    title = "Video Player",
    playing = false,
    onEnded,
    className = "",
}: LmsVideoPlayerProps) {
    const [showEndOverlay, setShowEndOverlay] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const videoSource = useMemo(() => {
        try {
            // YouTube
            if (url.includes("youtube.com") || url.includes("youtu.be")) {
                const youtubeMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                if (youtubeMatch?.[1]) {
                    return {
                        type: 'video' as const,
                        sources: [{
                            src: youtubeMatch[1],
                            provider: 'youtube' as const,
                        }],
                    };
                }
            }

            // Vimeo
            if (url.includes("vimeo.com")) {
                const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/);
                if (vimeoMatch?.[1]) {
                    return {
                        type: 'video' as const,
                        sources: [{
                            src: vimeoMatch[1],
                            provider: 'vimeo' as const,
                        }],
                    };
                }
            }

            // Direct video files
            if (url.match(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i)) {
                return {
                    type: 'video' as const,
                    sources: [{
                        src: url,
                        type: 'video/mp4'
                    }],
                };
            }

            return null;
        } catch {
            return null;
        }
    }, [url]);

    const plyrOptions = useMemo(() => ({
        controls: [
            'play-large', 'play', 'progress', 'current-time', 'duration',
            'mute', 'volume', 'settings', 'fullscreen',
        ],
        settings: ['quality', 'speed'],
        autoplay: playing,
        ratio: '16:9',
        displayDuration: true,
        hideControls: false,
        clickToPlay: true,
        disableContextMenu: false,
        // YouTube specific options
        youtube: {
            noCookie: true,
            rel: 0, // Shows related videos from the same channel
            modestbranding: 1, // Reduces YouTube logo
            iv_load_policy: 3, // Hides video annotations
            widget_referrer: window.location.href,
            enablejsapi: 1,
            origin: window.location.origin,
            showinfo: 0, //  Removes video title and uploader info (though deprecated, still helps)
            controls: 0,
            disablekb: 1,
            fs: 1,
            playsInLine: 1,
            showRelatedVideos: false,
        },
        // Vimeo specific options
        vimeo: {
            byline: false, // Hides the author's name
            portrait: false, // Hides the author's profile picture
            title: false, // Hides the video title
            speed: true,
            transparent: false,
            badge: false, // Affects the Vimeo logo (may require paid plan)
        },
        html5: {
            hls: {
                autoStart: true,
            },
            vhs: {
                overrideNative: true,
            },
        },
    }), [playing]);

    // Handle play/pause programmatically
    useEffect(() => {
        if (!playerRef.current) return;

        try {
            const plyrInstance = playerRef.current.plyr;
            if (plyrInstance) {
                if (playing) {
                    plyrInstance.play();
                } else {
                    plyrInstance.pause();
                }
            }
        } catch (error) {
            console.warn('Error during play/pause:', error);
        }
    }, [playing]);

    // Reset on URL change
    useEffect(() => {
        setShowEndOverlay(false);
        setError(null);
    }, [url]);

    // Fix for Plyr styling issues
    useEffect(() => {
        const fixPlyrStyling = () => {
            if (containerRef.current) {
                // Remove any default margins/padding from Plyr elements
                const plyrElements = containerRef.current.querySelectorAll('.plyr');
                plyrElements.forEach(element => {
                    (element as HTMLElement).style.margin = '0';
                    (element as HTMLElement).style.padding = '0';
                });

                // Fix video container styling
                const videoContainers = containerRef.current.querySelectorAll('.plyr__video-wrapper');
                videoContainers.forEach(container => {
                    (container as HTMLElement).style.margin = '0';
                    (container as HTMLElement).style.padding = '0';
                    (container as HTMLElement).style.borderRadius = '0';
                });

                // Fix the actual video element
                const videoElements = containerRef.current.querySelectorAll('video');
                videoElements.forEach(video => {
                    (video as HTMLElement).style.margin = '0';
                    (video as HTMLElement).style.padding = '0';
                    (video as HTMLElement).style.borderRadius = '0';
                    (video as HTMLElement).style.objectFit = 'contain';
                });
            }
        };

        // Apply fixes after a short delay to ensure Plyr has rendered
        const timer = setTimeout(fixPlyrStyling, 100);
        return () => clearTimeout(timer);
    }, [url, showEndOverlay]);

    const handleEnded = () => {
        setShowEndOverlay(true);
        onEnded?.();
    };

    const handleError = () => {
        setError('Failed to load video');
    };

    const replayVideo = () => {
        setShowEndOverlay(false);

        if (playerRef.current) {
            try {
                const plyrInstance = playerRef.current.plyr;
                if (plyrInstance) {
                    plyrInstance.restart();
                }
            } catch (error) {
                console.warn('Error during replay:', error);
            }
        }
    };

    if (!videoSource || error) {
        return (
            <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center ${className}`}>
                <div className="text-center p-6">
                    <div className="text-red-500 font-semibold mb-2">Error loading video</div>
                    <p className="text-sm text-gray-600 mb-4">{error || "Invalid video URL"}</p>
                    <Button variant="outline" onClick={() => window.open(url, "_blank")} className="flex items-center gap-2">
                        <ExternalLink size={16} />
                        Open video link
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`relative w-full aspect-video bg-black ${className}`}
            style={{
                borderRadius: '1rem',
                overflow: 'hidden',
                margin: 0,
                padding: 0
            }}
        >
            <div
                className={`h-full w-full ${showEndOverlay ? "opacity-0" : "opacity-100"}`}
                style={{
                    margin: 0,
                    padding: 0
                }}
            >
                <Plyr
                    ref={playerRef}
                    source={videoSource}
                    options={plyrOptions}
                    onEnded={handleEnded}
                    onError={handleError}
                />
            </div>

            {showEndOverlay && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 text-white z-20">
                    <div className="text-center px-4">
                        <h3 className="text-xl font-semibold mb-2">{title}</h3>
                        <p className="text-sm opacity-80">You can replay or continue.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" size="lg" className="rounded-xl bg-white text-black hover:bg-gray-100" onClick={replayVideo}>
                            Replay
                        </Button>
                        <Button size="lg" className="rounded-xl bg-blue-600 hover:bg-blue-700">
                            Next Lesson
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
