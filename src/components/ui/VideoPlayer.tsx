import { useRef, useState, useCallback, useEffect } from "react";
import { AlertCircle, Download, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { isMovFile } from "@/lib/media-url";

interface VideoPlayerProps {
  src: string;
  mimeType?: string;
  poster?: string;
  className?: string;
}

// Timeout for "loading too long" state (15 seconds)
const LOADING_TIMEOUT_MS = 15000;

/**
 * Video Player with loading state handling
 * - Plays video from CDN URL
 * - Shows "loading too long" state after 15s
 * - Shows error state with download option
 * - Warning for MOV files
 */
export function VideoPlayer({ src, mimeType, poster, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [loadingTooLong, setLoadingTooLong] = useState(false);
  const [hasMetadata, setHasMetadata] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isMov = isMovFile(mimeType, src);

  // Start loading timeout
  useEffect(() => {
    if (hasMetadata || error) return;

    timeoutRef.current = setTimeout(() => {
      if (!hasMetadata && !error) {
        setLoadingTooLong(true);
      }
    }, LOADING_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [src, hasMetadata, error]);

  const handleLoadedMetadata = useCallback(() => {
    setHasMetadata(true);
    setLoadingTooLong(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget;
    console.error('[VideoPlayer] Error:', {
      src,
      code: el.error?.code,
      message: el.error?.message,
    });
    setErrorCode(el.error?.code ?? null);
    setError(true);
    setLoadingTooLong(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [src]);

  // Error state
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open(src, "_blank")}
          >
            <Download className="h-4 w-4 mr-1" />
            Tải xuống
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative bg-black rounded-lg overflow-hidden", className)}>
      {/* MOV warning */}
      {isMov && (
        <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 bg-yellow-500/90 text-yellow-950 text-xs px-3 py-1.5 rounded-md">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>File MOV - có thể không phát được trên một số trình duyệt</span>
        </div>
      )}

      {/* Loading too long overlay */}
      {loadingTooLong && !hasMetadata && (
        <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center gap-4 p-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <div className="text-center">
            <p className="text-sm font-medium text-white">Video đang tải lâu...</p>
            <p className="text-xs text-gray-400 mt-1">
              Video có thể quá lớn hoặc CDN chưa hỗ trợ streaming tốt.
            </p>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => window.open(src, "_blank")}
          >
            <Download className="h-4 w-4 mr-1" />
            Mở / Tải xuống
          </Button>
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
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
      >
        Trình duyệt không hỗ trợ video.
      </video>
    </div>
  );
}

export default VideoPlayer;
