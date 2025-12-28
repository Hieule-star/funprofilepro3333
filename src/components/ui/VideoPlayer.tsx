import { useMemo, useRef, useEffect, useState } from "react";
import { AlertCircle, Download, ExternalLink, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// R2 public domain for deriving originUrl from CDN
const R2_PUBLIC_DOMAIN = "https://pub-3b3220edd327468ea9f453204f9384ca.r2.dev";
const CDN_DOMAIN = "https://media.richkid.cloud";

interface VideoPlayerProps {
  /** URL ưu tiên để phát (thường là CDN) */
  r2Url: string;
  /** Origin (R2 public) để fallback khi CDN lỗi */
  originUrl?: string;
  poster?: string;
  className?: string;
}

/**
 * Simple Video Player component
 * - Thử phát bằng CDN trước
 * - Nếu lỗi network/404 do CDN thì fallback qua originUrl (nếu có)
 * - Nếu vẫn lỗi thì hiển thị hướng dẫn + debug info (thường là lỗi codec/encode)
 */
export function VideoPlayer({ r2Url, originUrl, poster, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-derive originUrl from CDN URL if not provided
  const derivedOriginUrl = useMemo(() => {
    if (originUrl) return originUrl;
    // If r2Url is CDN, convert to R2 public origin
    if (r2Url?.includes("media.richkid.cloud")) {
      return r2Url.replace(CDN_DOMAIN, R2_PUBLIC_DOMAIN);
    }
    return null;
  }, [r2Url, originUrl]);

  const [activeUrl, setActiveUrl] = useState(r2Url);
  const [error, setError] = useState(false);
  const [lastErrorCode, setLastErrorCode] = useState<number | null>(null);

  // Reset when URL changes
  useEffect(() => {
    setActiveUrl(r2Url);
    setError(false);
    setLastErrorCode(null);
  }, [r2Url]);

  const debugInfo = useMemo(() => {
    const el = videoRef.current;
    return {
      activeUrl,
      originUrl: derivedOriginUrl,
      networkState: el?.networkState ?? null,
      readyState: el?.readyState ?? null,
      errorCode: lastErrorCode,
    };
  }, [activeUrl, derivedOriginUrl, lastErrorCode]);

  const copyDebug = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    } catch {
      // noop
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget;
    const code = el.error?.code ?? null;

    console.warn("[VideoPlayer] Video error", {
      url: activeUrl,
      originUrl,
      code,
      networkState: el.networkState,
      readyState: el.readyState,
    });

    setLastErrorCode(code);

    // If CDN failed, try origin once
    if (derivedOriginUrl && activeUrl !== derivedOriginUrl) {
      setActiveUrl(derivedOriginUrl);
      return;
    }

    setError(true);
  };

  // Error state
  if (error) {
    const isDecodeLike = lastErrorCode === 3 || lastErrorCode === 4; // MEDIA_ERR_DECODE / SRC_NOT_SUPPORTED

    return (
      <div className={cn("relative bg-muted rounded-lg overflow-hidden", className)}>
        <div className="aspect-video flex flex-col items-center justify-center gap-4 p-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div className="text-center">
            <p className="text-sm font-medium">Không thể phát video</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isDecodeLike
                ? "Có thể video đang dùng codec không hỗ trợ (ví dụ HEVC/H.265)."
                : "Có thể CDN/origin đang lỗi hoặc trình duyệt không tải được."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(activeUrl, "_blank")}
              aria-label="Tải video xuống">
              <Download className="h-4 w-4 mr-1" />
              Tải xuống
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.open(activeUrl, "_blank")}
              aria-label="Mở link video">
              <ExternalLink className="h-4 w-4 mr-1" />
              Mở link
            </Button>
            <Button variant="ghost" size="sm" onClick={copyDebug} aria-label="Copy debug info">
              <Copy className="h-4 w-4 mr-1" />
              Copy debug
            </Button>
          </div>

          {isDecodeLike && (
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              Gợi ý: nếu quay bằng iPhone, hãy đặt Camera → Formats → <b>Most Compatible</b> rồi upload lại.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Normal playback
  return (
    <div className={cn("relative bg-black rounded-lg overflow-hidden", className)}>
      <video
        ref={videoRef}
        src={activeUrl}
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
