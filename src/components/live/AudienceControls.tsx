import { Volume2, VolumeX, Maximize, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface AudienceControlsProps {
  onLeave: () => void;
}

export function AudienceControls({ onLeave }: AudienceControlsProps) {
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // TODO: Implement actual audio mute for remote tracks
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className="flex items-center justify-center gap-3">
      {/* Mute Toggle */}
      <Button
        variant="secondary"
        size="icon"
        onClick={toggleMute}
        className={isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : ''}
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </Button>

      {/* Fullscreen Toggle */}
      <Button variant="secondary" size="icon" onClick={toggleFullscreen}>
        <Maximize className="h-5 w-5" />
      </Button>

      {/* Leave Button */}
      <Button variant="outline" onClick={onLeave} className="gap-2">
        <LogOut className="h-4 w-4" />
        Leave
      </Button>
    </div>
  );
}
