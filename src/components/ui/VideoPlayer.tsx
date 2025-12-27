import { useState, useRef, useEffect } from "react";
import { AlertCircle, Download, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface VideoPlayerProps {
  r2Url: string;
  poster?: string;
  className?: string;
}

/**
 * Simple Video Player component
 * Uses native HTML5 video with R2/CDN URL for direct playback
 */
export function VideoPlayer({
  r2Url,
  poster,
  className,
}: VideoPlayerProps) {
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset error state when URL changes
  useEffect(() => {
    setError(false);
  }, [r2Url]);

  // Handle video error
  const handleError = () => {
    console.warn("[VideoPlayer] Failed to load video:", r2Url);
    setError(true);
  };

  // Error state - show download options
  if (error) {
    return (
      <div className={cn("relative bg-muted rounded-lg overflow-hidden", className)}>
        <div className="aspect-video flex flex-col items-center justify-center gap-4 p-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div className="text-center">
            <p className="text-sm font-medium">Không thể phát video</p>
            <p className="text-xs text-muted-foreground mt-1">
              Video này có thể không tương thích với trình duyệt của bạn
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(r2Url, "_blank")}
            >
              <Download className="h-4 w-4 mr-1" />
              Tải xuống
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(r2Url, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Mở link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Normal video playback
  return (
    <div className={cn("relative bg-black rounded-lg overflow-hidden", className)}>
      <video
        ref={videoRef}
        src={r2Url}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        className="w-full h-auto object-contain"
        onError={handleError}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export default VideoPlayer;
