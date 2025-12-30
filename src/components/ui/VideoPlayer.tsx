import { useState, useCallback } from "react";
import { AlertCircle, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  preload?: "none" | "metadata" | "auto";
}

/**
 * Simple Video Player
 * Flow: Browser → Worker CDN (media.camly.co) → R2
 */
export function VideoPlayer({ src, poster, className, preload = "none" }: VideoPlayerProps) {
  const [error, setError] = useState(false);

  const handleError = useCallback(() => {
    console.error('[VideoPlayer] Error loading:', src);
    setError(true);
  }, [src]);

  if (error) {
    return (
      <div className={cn("relative bg-muted rounded-lg overflow-hidden", className)}>
        <div className="aspect-video flex flex-col items-center justify-center gap-4 p-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm">Không thể phát video</p>
          <Button variant="outline" size="sm" onClick={() => window.open(src, "_blank")}>
            <Download className="h-4 w-4 mr-1" />
            Tải xuống
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative bg-black rounded-lg overflow-hidden", className)}>
      <video
        src={src}
        poster={poster}
        controls
        playsInline
        preload={preload}
        className="w-full h-auto object-contain"
        onError={handleError}
      />
    </div>
  );
}

export default VideoPlayer;
