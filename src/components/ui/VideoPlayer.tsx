import { useRef, useState, useCallback } from "react";
import { AlertCircle, Download, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { isMovFile } from "@/lib/media-url";

interface VideoPlayerProps {
  src: string;
  mimeType?: string;
  poster?: string;
  className?: string;
}

/**
 * Video Player Component
 * - Plays video from CDN URL directly
 * - Shows error state with download fallback
 * - Warning banner for MOV files
 */
export function VideoPlayer({ src, mimeType, poster, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  const isMov = isMovFile(mimeType, src);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget;
    console.error('[VideoPlayer] Error:', { src, code: el.error?.code, message: el.error?.message });
    setErrorCode(el.error?.code ?? null);
    setError(true);
  }, [src]);

  if (error) {
    const isCodecIssue = errorCode === 3 || errorCode === 4;
    
    return (
      <div className={cn("relative bg-muted rounded-lg overflow-hidden", className)}>
        <div className="aspect-video flex flex-col items-center justify-center gap-4 p-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div className="text-center">
            <p className="text-sm font-medium">Không thể phát video</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isMov 
                ? "File MOV có thể không tương thích. Hãy upload lại với định dạng MP4."
                : isCodecIssue
                  ? "Video dùng codec không hỗ trợ (ví dụ HEVC/H.265)."
                  : "Không thể tải video. Vui lòng thử lại sau."}
            </p>
          </div>
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
      {isMov && (
        <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 bg-yellow-500/90 text-yellow-950 text-xs px-3 py-1.5 rounded-md">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>File MOV - có thể không phát được trên một số trình duyệt</span>
        </div>
      )}
      
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        className="w-full h-auto object-contain"
        onError={handleError}
      >
        Trình duyệt không hỗ trợ video.
      </video>
    </div>
  );
}

export default VideoPlayer;
