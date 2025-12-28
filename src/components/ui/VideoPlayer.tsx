import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { AlertCircle, Download, ExternalLink, Copy, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { 
  buildCdnUrl, 
  buildOriginUrl, 
  checkCdnHealth, 
  isMovFile,
  extractStorageKey 
} from "@/lib/media-url";

interface VideoPlayerProps {
  /** Storage key (r2_key) từ database - ưu tiên dùng */
  storageKey?: string;
  /** URL trực tiếp (legacy support) - sẽ extract storage key */
  r2Url?: string;
  /** MIME type để detect MOV files */
  mimeType?: string;
  /** Origin URL để fallback (nếu không có sẽ tự derive từ storageKey) */
  originUrl?: string;
  poster?: string;
  className?: string;
}

type SourceType = 'cdn' | 'origin';

/**
 * Video Player với CDN health check và fallback
 * 
 * Flow:
 * 1. Health check CDN với HEAD + Range request
 * 2. Nếu CDN healthy (200/206) → dùng CDN
 * 3. Nếu CDN unhealthy → dùng Origin (R2 public)
 * 4. Nếu video lỗi khi phát → fallback từ CDN → Origin
 * 5. Nếu cả hai lỗi → hiển thị error + debug info
 */
export function VideoPlayer({ 
  storageKey, 
  r2Url, 
  mimeType, 
  originUrl, 
  poster, 
  className 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Derive storage key from r2Url if not provided directly
  const resolvedStorageKey = useMemo(() => {
    if (storageKey) return storageKey;
    if (r2Url) return extractStorageKey(r2Url);
    return null;
  }, [storageKey, r2Url]);

  // Build URLs from storage key
  const cdnUrl = useMemo(() => 
    resolvedStorageKey ? buildCdnUrl(resolvedStorageKey) : r2Url || '',
  [resolvedStorageKey, r2Url]);
  
  const derivedOriginUrl = useMemo(() => {
    if (originUrl) return originUrl;
    if (resolvedStorageKey) return buildOriginUrl(resolvedStorageKey);
    return null;
  }, [originUrl, resolvedStorageKey]);

  // State
  const [isChecking, setIsChecking] = useState(true);
  const [activeSource, setActiveSource] = useState<SourceType>('cdn');
  const [error, setError] = useState(false);
  const [lastErrorCode, setLastErrorCode] = useState<number | null>(null);
  
  // Check if file is MOV
  const isMov = useMemo(() => 
    isMovFile(mimeType, resolvedStorageKey),
  [mimeType, resolvedStorageKey]);

  // Current active URL
  const activeUrl = useMemo(() => {
    if (activeSource === 'cdn') return cdnUrl;
    return derivedOriginUrl || cdnUrl;
  }, [activeSource, cdnUrl, derivedOriginUrl]);

  // Health check CDN on mount
  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      if (!resolvedStorageKey) {
        // No storage key, skip health check and use URL directly
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      
      try {
        const isHealthy = await checkCdnHealth(resolvedStorageKey);
        
        if (cancelled) return;
        
        if (isHealthy) {
          setActiveSource('cdn');
          console.log('[VideoPlayer] CDN healthy, using CDN:', cdnUrl);
        } else {
          setActiveSource('origin');
          console.warn('[VideoPlayer] CDN unhealthy, using origin:', derivedOriginUrl);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[VideoPlayer] Health check error:', err);
        setActiveSource('origin');
      }
      
      setIsChecking(false);
    }

    checkHealth();

    return () => { cancelled = true; };
  }, [resolvedStorageKey, cdnUrl, derivedOriginUrl]);

  // Reset state when URL changes
  useEffect(() => {
    setError(false);
    setLastErrorCode(null);
    setActiveSource('cdn');
    setIsChecking(true);
  }, [resolvedStorageKey, r2Url]);

  // Debug info
  const debugInfo = useMemo(() => {
    const el = videoRef.current;
    return {
      storageKey: resolvedStorageKey,
      activeSource,
      activeUrl,
      cdnUrl,
      originUrl: derivedOriginUrl,
      mimeType,
      isMov,
      networkState: el?.networkState ?? null,
      readyState: el?.readyState ?? null,
      errorCode: lastErrorCode,
    };
  }, [resolvedStorageKey, activeSource, activeUrl, cdnUrl, derivedOriginUrl, mimeType, isMov, lastErrorCode]);

  const copyDebug = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    } catch {
      // noop
    }
  }, [debugInfo]);

  // Handle video error with fallback
  const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget;
    const code = el.error?.code ?? null;

    console.error('[VideoPlayer] Video playback error:', {
      source: activeSource,
      url: activeUrl,
      code,
      networkState: el.networkState,
      readyState: el.readyState,
      error: el.error?.message,
    });

    setLastErrorCode(code);

    // Try fallback from CDN to origin
    if (activeSource === 'cdn' && derivedOriginUrl) {
      console.warn('[VideoPlayer] Falling back from CDN to origin:', derivedOriginUrl);
      setActiveSource('origin');
      return;
    }

    // Both sources failed
    setError(true);
  }, [activeSource, activeUrl, derivedOriginUrl]);

  // Loading state during health check
  if (isChecking) {
    return (
      <div className={cn("relative bg-muted rounded-lg overflow-hidden", className)}>
        <div className="aspect-video flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Đang kiểm tra kết nối...</span>
        </div>
      </div>
    );
  }

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
              {isMov 
                ? "File MOV có thể không tương thích với trình duyệt. Vui lòng upload lại với định dạng MP4."
                : isDecodeLike
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

          {isDecodeLike && !isMov && (
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
      {/* MOV Warning Banner */}
      {isMov && (
        <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 bg-yellow-500/90 text-yellow-950 text-xs px-3 py-1.5 rounded-md">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>File MOV - có thể không phát được trên một số trình duyệt</span>
        </div>
      )}
      
      {/* Source indicator for debugging */}
      {activeSource === 'origin' && (
        <div className="absolute top-2 right-2 z-10 bg-orange-500/80 text-white text-[10px] px-2 py-0.5 rounded">
          Origin
        </div>
      )}
      
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
