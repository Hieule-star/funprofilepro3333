import { forwardRef } from 'react';
import { Loader2, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoStageProps {
  isLoading?: boolean;
  isHost?: boolean;
  hasVideo?: boolean;
  className?: string;
}

export const VideoStage = forwardRef<HTMLDivElement, VideoStageProps>(
  ({ isLoading, isHost, hasVideo = true, className }, ref) => {
    return (
      <div
        className={cn(
          'relative bg-black rounded-lg overflow-hidden',
          'aspect-video lg:aspect-video',
          className
        )}
      >
        {/* Video Container */}
        <div
          ref={ref}
          className="absolute inset-0 w-full h-full"
          style={{ backgroundColor: '#000' }}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-3 text-white">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="text-sm">
                {isHost ? 'Starting stream...' : 'Connecting to stream...'}
              </p>
            </div>
          </div>
        )}

        {/* No Video Overlay */}
        {!isLoading && !hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <VideoOff className="h-16 w-16" />
              <p className="text-sm">Camera is off</p>
            </div>
          </div>
        )}

        {/* Gradient Overlay for Controls */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      </div>
    );
  }
);

VideoStage.displayName = 'VideoStage';
