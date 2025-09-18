
import { VideoItem } from '@/types/enhancedLms';

export const videoUtils = {
  // Parse YouTube URL to extract video ID
  parseYouTubeUrl: (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  },

  // Parse Vimeo URL to extract video ID
  parseVimeoUrl: (url: string): string | null => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  },

  // Get video type from URL
  getVideoType: (url: string): 'youtube' | 'vimeo' | 'external' => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('vimeo.com')) {
      return 'vimeo';
    }
    return 'external';
  },

  // Format duration from seconds to readable format
  formatDuration: (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  // Parse duration string to seconds
  parseDurationToSeconds: (duration: string): number => {
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  },

  // Create video runtime object
  createRuntime: (durationSeconds: number) => {
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const seconds = durationSeconds % 60;

    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
    };
  },

  // Get embed URL for video
  getEmbedUrl: (video: VideoItem): string => {
    switch (video.source) {
      case 'youtube':
        if (video.source_video_id) {
          return `https://www.youtube.com/embed/${video.source_video_id}`;
        }
        if (video.source_youtube) {
          const videoId = videoUtils.parseYouTubeUrl(video.source_youtube);
          return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
        }
        return '';
      
      case 'vimeo':
        if (video.source_video_id) {
          return `https://player.vimeo.com/video/${video.source_video_id}`;
        }
        if (video.source_vimeo) {
          const videoId = videoUtils.parseVimeoUrl(video.source_vimeo);
          return videoId ? `https://player.vimeo.com/video/${videoId}` : '';
        }
        return '';
      
      case 'external':
        return video.source_external_url || '';
      
      case 'embedded':
        return video.source_embedded || '';
      
      default:
        return '';
    }
  },
};
