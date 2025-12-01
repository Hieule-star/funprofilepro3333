import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from "lucide-react";
import { WebRTCManager } from "@/utils/WebRTCManager";

interface VideoCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  targetUserId: string;
  targetUsername: string;
  conversationId: string;
  isCaller: boolean;
  callAccepted: boolean;
  selectedDevices?: {
    videoDeviceId: string;
    audioDeviceId: string;
  } | null;
}

export default function VideoCallModal({
  open,
  onOpenChange,
  currentUserId,
  targetUserId,
  targetUsername,
  conversationId,
  isCaller,
  callAccepted,
  selectedDevices
}: VideoCallModalProps) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<'waiting' | 'connecting' | 'connected' | 'ended'>(
    isCaller ? 'waiting' : 'connecting'
  );
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);

  // Wait for call acceptance before initializing WebRTC
  useEffect(() => {
    if (!open) return;
    
    // Caller waits for acceptance
    if (isCaller && !callAccepted) {
      setCallStatus('waiting');
      return;
    }

    // Once accepted or if callee, initialize WebRTC
    if (!isCaller || callAccepted) {
      setCallStatus('connecting');
      
      const initializeCall = async () => {
        try {
          const manager = new WebRTCManager(
            currentUserId,
            targetUserId,
            conversationId,
            (remoteStream) => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
                setCallStatus('connected');
              }
            },
            () => {
              setCallStatus('ended');
              onOpenChange(false);
            }
          );

          webrtcManagerRef.current = manager;
          await manager.initialize(isCaller);

          let localStream: MediaStream;
          if (isCaller) {
            localStream = await manager.startCall(
              videoEnabled,
              selectedDevices?.videoDeviceId,
              selectedDevices?.audioDeviceId
            );
          } else {
            localStream = await manager.answerCall(videoEnabled);
          }

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
        } catch (error) {
          console.error("Error initializing call:", error);
          onOpenChange(false);
        }
      };

      initializeCall();
    }

    return () => {
      webrtcManagerRef.current?.endCall();
    };
  }, [open, currentUserId, targetUserId, conversationId, isCaller, callAccepted, videoEnabled]);

  const toggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    webrtcManagerRef.current?.toggleAudio(newState);
  };

  const toggleVideo = () => {
    const newState = !videoEnabled;
    setVideoEnabled(newState);
    webrtcManagerRef.current?.toggleVideo(newState);
  };

  const endCall = () => {
    webrtcManagerRef.current?.endCall();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden">
        <div className="relative w-full h-full bg-gray-900">
          {/* Remote video (large) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Local video (small, floating) */}
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {/* Call status với loading indicator */}
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
            {(callStatus === 'waiting' || callStatus === 'connecting') && (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            )}
            {callStatus === 'connected' && (
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
            {callStatus === 'ended' && (
              <div className="h-2 w-2 rounded-full bg-red-500" />
            )}
            <p className="text-white text-sm font-medium">
              {callStatus === 'waiting' && `Đang chờ ${targetUsername} phản hồi...`}
              {callStatus === 'connecting' && `Đang kết nối với ${targetUsername}...`}
              {callStatus === 'connected' && `Đang gọi ${targetUsername}`}
              {callStatus === 'ended' && 'Cuộc gọi đã kết thúc'}
            </p>
          </div>

          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <Button
              variant={audioEnabled ? "secondary" : "destructive"}
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={toggleAudio}
            >
              {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </Button>

            <Button
              variant={videoEnabled ? "secondary" : "destructive"}
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={toggleVideo}
            >
              {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>

            <Button
              variant="destructive"
              size="icon"
              className="h-16 w-16 rounded-full"
              onClick={endCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}