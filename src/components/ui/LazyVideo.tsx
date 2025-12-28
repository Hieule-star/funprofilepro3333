import { useState, useRef, useEffect, useCallback } from 'react';
import { Play } from "lucide-react";
import { VideoPlayer } from './VideoPlayer';
import { cn } from "@/lib/utils";

interface LazyVideoProps {
  r2Url: string;
  originUrl?: string;
  poster?: string;
  className?: string;
  nextVideoUrl?: string; // URL của video tiếp theo để preload
}

// Cache để tránh preload trùng lặp
const preloadedUrls = new Set<string>();

// Preload video metadata
const preloadVideoMetadata = (url: string) => {
  if (!url || preloadedUrls.has(url)) return;
  
  preloadedUrls.add(url);
  
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

export function LazyVideo({ r2Url, originUrl, poster, className, nextVideoUrl }: LazyVideoProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Observer cho preload (xa hơn - 500px)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preloadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isPreloading) {
          setIsPreloading(true);
          // Preload metadata của video hiện tại
          preloadVideoMetadata(r2Url);
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
  }, [r2Url, isPreloading]);

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
    if (nextVideoUrl) {
      preloadVideoMetadata(nextVideoUrl);
    }
  }, [nextVideoUrl]);

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
          r2Url={r2Url} 
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
