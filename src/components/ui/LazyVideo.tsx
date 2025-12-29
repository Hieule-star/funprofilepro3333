import { useState, useRef, useEffect, useCallback } from 'react';
import { Play } from "lucide-react";
import { VideoPlayer } from './VideoPlayer';
import { cn } from "@/lib/utils";
import { buildCdnUrl, extractStorageKey } from '@/lib/media-url';

interface LazyVideoProps {
  /** Storage key (r2_key) từ database - ưu tiên dùng */
  storageKey?: string;
  /** URL trực tiếp (legacy support) */
  r2Url?: string;
  /** MIME type để detect MOV files */
  mimeType?: string;
  /** Origin URL để fallback */
  originUrl?: string;
  poster?: string;
  className?: string;
  /** Storage key của video tiếp theo để preload */
  nextVideoKey?: string;
}

// Cache để tránh preload trùng lặp
const preloadedKeys = new Set<string>();

// Preload video metadata
const preloadVideoMetadata = (storageKey: string) => {
  // Validate key before preloading
  if (!storageKey || storageKey.trim() === '' || preloadedKeys.has(storageKey)) return;
  
  const url = buildCdnUrl(storageKey);
  // Skip if buildCdnUrl returned empty (invalid key)
  if (!url) return;
  
  preloadedKeys.add(storageKey);
  
  // Tạo video element ẩn để preload metadata
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.src = url;
  
  // Cleanup sau khi load metadata
  video.onloadedmetadata = () => {
    video.src = '';
    video.remove();
  };
  
  // Cleanup nếu có lỗi
  video.onerror = () => {
    video.src = '';
    video.remove();
  };
};

export function LazyVideo({ 
  storageKey, 
  r2Url, 
  mimeType,
  originUrl, 
  poster, 
  className, 
  nextVideoKey 
}: LazyVideoProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve storage key - ưu tiên storageKey prop, fallback extract từ r2Url
  const resolvedKey = storageKey || (r2Url ? extractStorageKey(r2Url) : null);

  // Observer cho preload (xa hơn - 500px)
  useEffect(() => {
    const container = containerRef.current;
    // Skip preload nếu không có container hoặc không có valid key
    if (!container || !resolvedKey) return;

    const preloadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isPreloading) {
          setIsPreloading(true);
          // Preload metadata của video hiện tại
          preloadVideoMetadata(resolvedKey);
          preloadObserver.disconnect();
        }
      },
      { 
        rootMargin: '500px', // Preload sớm hơn
        threshold: 0
      }
    );

    preloadObserver.observe(container);

    return () => preloadObserver.disconnect();
  }, [resolvedKey, isPreloading]);

  // Observer cho load thực sự (gần hơn - 200px)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const loadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasLoaded(true);
          loadObserver.disconnect();
        }
      },
      { 
        rootMargin: '200px',
        threshold: 0.1
      }
    );

    loadObserver.observe(container);

    return () => loadObserver.disconnect();
  }, []);

  // Preload video tiếp theo khi video hiện tại bắt đầu play
  const handleVideoPlay = useCallback(() => {
    if (nextVideoKey) {
      preloadVideoMetadata(nextVideoKey);
    }
  }, [nextVideoKey]);

  // Lắng nghe sự kiện play từ video
  useEffect(() => {
    if (!hasLoaded) return;
    
    const container = containerRef.current;
    if (!container) return;

    const video = container.querySelector('video');
    if (!video) return;

    video.addEventListener('play', handleVideoPlay);
    
    return () => {
      video.removeEventListener('play', handleVideoPlay);
    };
  }, [hasLoaded, handleVideoPlay]);

  return (
    <div ref={containerRef} className={cn("min-h-[200px]", className)}>
      {hasLoaded ? (
        <VideoPlayer 
          storageKey={storageKey}
          r2Url={r2Url}
          mimeType={mimeType}
          originUrl={originUrl} 
          poster={poster}
          className={className}
        />
      ) : (
        <div className="aspect-video flex items-center justify-center bg-muted/50 rounded-lg border border-border/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Play className="h-6 w-6 text-primary ml-1" />
            </div>
            <span className="text-xs">
              {isPreloading ? 'Đang tải...' : 'Video sẽ tải khi bạn cuộn tới'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LazyVideo;
