import { Mic, MicOff, Video, VideoOff, PhoneOff, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface HostControlsProps {
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onEndLive: () => void;
  startTime?: Date;
}

export function HostControls({
  isMicEnabled,
  isCameraEnabled,
  onToggleMic,
  onToggleCamera,
  onEndLive,
  startTime,
}: HostControlsProps) {
  const [duration, setDuration] = useState('00:00');

  useEffect(() => {
    if (!startTime) return;

    const updateDuration = () => {
      const diff = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setDuration(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center justify-center gap-3">
      {/* Duration */}
      <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-white">
        <Timer className="h-4 w-4" />
        <span className="text-sm font-medium">{duration}</span>
      </div>

      {/* Mic Toggle */}
      <Button
        variant="secondary"
        size="icon"
        className={!isMicEnabled ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : ''}
        onClick={onToggleMic}
      >
        {isMicEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </Button>

      {/* Camera Toggle */}
      <Button
        variant="secondary"
        size="icon"
        className={!isCameraEnabled ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : ''}
        onClick={onToggleCamera}
      >
        {isCameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </Button>

      {/* End Live Button */}
      <Button
        variant="destructive"
        size="icon"
        onClick={onEndLive}
        className="ml-2"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}
