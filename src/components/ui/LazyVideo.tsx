import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Film } from "lucide-react";
import { VideoPlayer } from './VideoPlayer';
import { cn } from "@/lib/utils";

interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
}

/**
 * Lazy Video Component
 * - Shows thumbnail/placeholder until user clicks to play
 * - Extracts first frame as thumbnail when video metadata loads
 * - Reduces bandwidth by not loading video until interaction
 */
export function LazyVideo({ src, poster, className }: LazyVideoProps) {
  const [isActivated, setIsActivated] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(poster || null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy load - only start processing when in viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px', threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Extract thumbnail from video when visible
  useEffect(() => {
    if (!isVisible || thumbnail || isActivated) return;

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';

    const handleLoadedData = () => {
      video.currentTime = 0.5; // Seek to 0.5s for better frame
    };

    const handleSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setThumbnail(dataUrl);
        }
      } catch (e) {
        // CORS error - fallback to no thumbnail
        console.log('[LazyVideo] Cannot extract thumbnail (CORS)');
      }
      video.remove();
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.src = src;

    // Timeout fallback
    const timeout = setTimeout(() => video.remove(), 5000);

    return () => {
      clearTimeout(timeout);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.remove();
    };
  }, [isVisible, thumbnail, src, isActivated]);

  const handleActivate = useCallback(() => {
    setIsActivated(true);
  }, []);

  return (
    <div ref={containerRef} className={cn("min-h-[200px]", className)}>
      {isActivated ? (
        <VideoPlayer src={src} poster={thumbnail || undefined} className={className} preload="auto" />
      ) : (
        <div 
          className="aspect-video relative cursor-pointer group bg-muted rounded-lg overflow-hidden"
          onClick={handleActivate}
        >
          {thumbnail ? (
            <img 
              src={thumbnail} 
              alt="Video thumbnail" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <Film className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-16 h-16 rounded-full bg-primary/90 group-hover:bg-primary flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
              <Play className="h-7 w-7 text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </div>
          
          {/* Duration badge placeholder */}
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs font-medium">
            Video
          </div>
        </div>
      )}
    </div>
  );
}

export default LazyVideo;
