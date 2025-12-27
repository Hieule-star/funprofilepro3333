import { useState, useRef, useEffect } from "react";
import { Play, AlertCircle, Loader2, Download, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStreamStatusPolling } from "@/hooks/useStreamStatusPolling";

export type StreamStatus = "pending" | "processing" | "ready" | "error" | null;

interface VideoPlayerProps {
  r2Url: string;
  streamPlaybackUrl?: string | null;
  streamId?: string | null;
  streamStatus?: StreamStatus;
  mediaAssetId?: string | null;
  streamError?: string | null; // Error message from last_pin_error
  enablePolling?: boolean; // Enable automatic polling for processing videos
  poster?: string;
  className?: string;
}

/**
 * Smart Video Player component
 * - If Stream is ready (streamStatus='ready' + streamPlaybackUrl) → use Cloudflare Stream iframe embed
 * - If Stream is processing → show "Processing..." overlay
 * - If Stream error or not available → fallback to native HTML5 video with R2 URL
 */
export function VideoPlayer({
  r2Url,
  streamPlaybackUrl,
  streamId,
  streamStatus: propStreamStatus,
  mediaAssetId,
  streamError: propStreamError,
  enablePolling = true,
  poster,
  className,
}: VideoPlayerProps) {
  const [useNativeFallback, setUseNativeFallback] = useState(false);
  const [nativeError, setNativeError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Use polling hook for processing videos
  const {
    streamStatus: polledStatus,
    streamPlaybackUrl: polledPlaybackUrl,
    streamError: polledError,
    isPolling,
  } = useStreamStatusPolling(
    enablePolling ? mediaAssetId : null,
    propStreamStatus
  );

  // Use polled values if polling is active, otherwise use props
  const streamStatus = enablePolling && polledStatus ? polledStatus : propStreamStatus;
  const effectiveStreamPlaybackUrl = enablePolling && polledPlaybackUrl ? polledPlaybackUrl : streamPlaybackUrl;
  const streamError = enablePolling && polledError ? polledError : propStreamError;

  // Determine which player to use
  const isStreamReady = streamStatus === "ready" && effectiveStreamPlaybackUrl;
  const isStreamProcessing = streamStatus === "processing";
  const isStreamError = streamStatus === "error";
  const shouldUseStream = isStreamReady && !useNativeFallback;

  // Build embed URL from stream ID if needed
  const embedUrl = streamId 
    ? `https://iframe.cloudflarestream.com/${streamId}?poster=${poster || ''}&controls=true&autoplay=false`
    : effectiveStreamPlaybackUrl;

  // Reset states when URLs change
  useEffect(() => {
    setUseNativeFallback(false);
    setNativeError(false);
  }, [r2Url, effectiveStreamPlaybackUrl]);

  // Handle native video error
  const handleNativeError = () => {
    console.warn("[VideoPlayer] Native video failed to load:", r2Url);
    setNativeError(true);
  };

  // Handle iframe load error (fallback to native)
  const handleIframeError = () => {
    console.warn("[VideoPlayer] Stream iframe failed, falling back to native");
    setUseNativeFallback(true);
  };

  // Retry Stream ingest
  const handleRetryStream = async () => {
    if (!mediaAssetId) {
      toast.error("Không thể retry: thiếu mediaAssetId");
      return;
    }

    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke("media-stream-retry", {
        body: { mediaAssetId },
      });

      if (error) throw error;

      toast.success("Đã gửi video để xử lý lại. Vui lòng đợi...");
      // Reload the page to see the new status
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      console.error("[VideoPlayer] Retry failed:", err);
      toast.error(`Retry thất bại: ${err.message}`);
    } finally {
      setRetrying(false);
    }
  };

  // Processing state
  if (isStreamProcessing && !useNativeFallback) {
    return (
      <div className={cn("relative bg-muted rounded-lg overflow-hidden", className)}>
        <div className="aspect-video flex flex-col items-center justify-center gap-3 p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-sm font-medium">Đang xử lý video...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Video đang được tối ưu hóa để phát mượt mà hơn
            </p>
            {isPolling && (
              <p className="text-xs text-primary/70 mt-2 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                Đang kiểm tra trạng thái...
              </p>
            )}
          </div>
        </div>
        {/* Show fallback option */}
        <div className="absolute bottom-2 right-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs opacity-70 hover:opacity-100"
            onClick={() => setUseNativeFallback(true)}
          >
            <Play className="h-3 w-3 mr-1" />
            Xem ngay
          </Button>
        </div>
      </div>
    );
  }

  // Stream ready - use iframe embed
  if (shouldUseStream && embedUrl) {
    return (
      <div className={cn("relative bg-black rounded-lg overflow-hidden", className)}>
        <div className="aspect-video">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onError={handleIframeError}
          />
        </div>
        {/* Stream badge */}
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Stream
        </div>
      </div>
    );
  }

  // Native video fallback
  if (!nativeError) {
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
          onError={handleNativeError}
        >
          Your browser does not support the video tag.
        </video>
        {/* Show status badge if Stream had error */}
        {isStreamError && mediaAssetId && (
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start gap-2">
            {/* Error message tooltip */}
            {streamError && (
              <div className="bg-destructive/90 text-destructive-foreground text-xs px-2 py-1 rounded max-w-[200px] truncate" title={streamError}>
                {streamError.replace("Stream Error: ", "")}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="bg-yellow-500/80 text-black text-xs px-2 py-1 h-auto hover:bg-yellow-400 ml-auto"
              onClick={handleRetryStream}
              disabled={retrying}
            >
              {retrying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Complete failure - show download option
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
          {mediaAssetId && (
            <Button
              variant="default"
              size="sm"
              onClick={handleRetryStream}
              disabled={retrying}
            >
              {retrying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Retry Stream
            </Button>
          )}
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

export default VideoPlayer;
