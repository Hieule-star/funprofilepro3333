import { useState, useRef, useEffect } from 'react';
import { Play } from "lucide-react";
import { VideoPlayer } from './VideoPlayer';
import { cn } from "@/lib/utils";

interface LazyVideoProps {
  r2Url: string;
  originUrl?: string;
  poster?: string;
  className?: string;
}

export function LazyVideo({ r2Url, originUrl, poster, className }: LazyVideoProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '200px',
        threshold: 0.1
      }
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

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
            <span className="text-xs">Video sẽ tải khi bạn cuộn tới</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LazyVideo;
