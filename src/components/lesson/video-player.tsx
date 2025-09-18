import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { videoHelpers } from "@/lib/api";
import { useState, useRef, useEffect } from "react";

interface VideoPlayerProps {
  video: any;
  title?: string;
  className?: string;
  autoPlay?: boolean;
}

export function VideoPlayer({ video, title, className, autoPlay = false }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const embedUrl = videoHelpers.getVideoEmbedUrl(video);
  const videoType = videoHelpers.getVideoType(video);


  useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [embedUrl]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError("Failed to load video content");
  };

  if (!embedUrl) {
    return (
      <div className={cn(
        "aspect-video bg-muted rounded-lg flex items-center justify-center",
        className
      )}>
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-muted-foreground/10 rounded-full flex items-center justify-center mx-auto">
            <Play className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No video content available</p>
        </div>
      </div>
    );
  }

  const getEmbedParams = () => {
    let params = "";
    
    if (videoType === 'youtube') {
      params = `?rel=0&modestbranding=1&showinfo=0&controls=1&disablekb=1&fs=1${autoPlay ? '&autoplay=1' : ''}`;
    } else if (videoType === 'vimeo') {
      params = `?title=0&byline=0&portrait=0&badge=0&controls=1${autoPlay ? '&autoplay=1' : ''}`;
    }
    
    return params;
  };

  const fullEmbedUrl = embedUrl + getEmbedParams();

  return (
    <div className={cn(
      "relative aspect-video bg-black rounded-lg overflow-hidden group",
      className
    )}>
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading video...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <Play className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-foreground">Video Unavailable</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Video iframe */}
      <iframe
        ref={iframeRef}
        src={fullEmbedUrl}
        title={title || "Video content"}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Video info overlay */}
      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-white font-medium text-sm truncate">{title}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {videoType?.toUpperCase()}
            </Badge>
          </div>
        </div>
      )}

      {/* Video type indicator */}
      <div className="absolute top-3 right-3">
        <Badge 
          variant="secondary" 
          className="bg-black/50 text-white border-0 backdrop-blur-sm"
        >
          {videoType?.toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}

// Separate component for external links
export function VideoLink({ video, title, className }: VideoPlayerProps) {
  const externalUrl = video?.source_external_url;

  if (!externalUrl) return null;

  return (
    <div className={cn(
      "aspect-video bg-gradient-primary rounded-lg flex items-center justify-center p-8",
      className
    )}>
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-primary-foreground/20 rounded-full flex items-center justify-center mx-auto">
          <Play className="h-10 w-10 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-primary-foreground mb-2">
            {title || "External Video Content"}
          </h3>
          <Button 
            asChild
            variant="secondary"
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <a 
              href={externalUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Watch Video
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}