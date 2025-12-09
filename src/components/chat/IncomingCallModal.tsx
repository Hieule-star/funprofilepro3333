import { useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff } from "lucide-react";

interface IncomingCallModalProps {
  open: boolean;
  callerName: string;
  callerAvatar?: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  open,
  callerName,
  callerAvatar,
  onAccept,
  onReject
}: IncomingCallModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play ringtone and vibrate when modal opens
  useEffect(() => {
    let vibrationInterval: NodeJS.Timeout | null = null;

    if (open) {
      // Play ringtone
      audioRef.current = new Audio('/sounds/message-notification.mp3');
      audioRef.current.loop = true;
      audioRef.current.play().catch(err => console.log('Could not play ringtone:', err));

      // Vibrate on mobile (pattern: vibrate 500ms, pause 300ms, repeat)
      if ('vibrate' in navigator) {
        // Initial vibration
        navigator.vibrate([500, 300, 500, 300, 500]);
        
        // Repeat vibration every 2.5 seconds
        vibrationInterval = setInterval(() => {
          navigator.vibrate([500, 300, 500, 300, 500]);
        }, 2500);
      }
    } else {
      // Stop ringtone
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      
      // Stop vibration
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (vibrationInterval) {
        clearInterval(vibrationInterval);
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    };
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onReject()}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center gap-6 py-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={callerAvatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {callerName?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">{callerName}</h3>
            <p className="text-muted-foreground">đang gọi</p>
          </div>

          <div className="flex gap-6">
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="destructive"
                size="lg"
                className="rounded-full h-16 w-16"
                onClick={onReject}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
              <span className="text-sm text-muted-foreground">Từ chối</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Button
                variant="default"
                size="lg"
                className="rounded-full h-16 w-16 bg-green-600 hover:bg-green-700"
                onClick={onAccept}
              >
                <Phone className="h-6 w-6" />
              </Button>
              <span className="text-sm text-muted-foreground">Chấp nhận</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}