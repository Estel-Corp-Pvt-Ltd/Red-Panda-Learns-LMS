import React from "react";

interface SmartVideoPlayerProps {
    url: string;
    width?: number;
    height?: number;
};

function getEmbedUrl(url: string): string {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) {
        return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&controls=1`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return url;
};

const SmartVideoPlayer: React.FC<SmartVideoPlayerProps> = ({ url, width = 1200, height = 700 }) => {
    const embedUrl = getEmbedUrl(url);

    return (
        <iframe
            src={embedUrl}
            // width={width}
            // height={height}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
        />
    );
};

export default SmartVideoPlayer;
