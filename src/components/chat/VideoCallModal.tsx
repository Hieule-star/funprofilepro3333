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
  const [isInitialized, setIsInitialized] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      console.log('=== VideoCallModal: Unmounting, cleaning up ===');
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.endCall();
        webrtcManagerRef.current = null;
      }
      setIsInitialized(false);
    };
  }, []);

  // Initialize WebRTC connection
  useEffect(() => {
    if (!open) {
      console.log('=== VideoCallModal: Modal closed, resetting ===');
      setIsInitialized(false);
      return;
    }
    
    // Prevent re-initialization
    if (isInitialized || webrtcManagerRef.current) {
      console.log('=== VideoCallModal: Already initialized, skipping ===');
      return;
    }
    
    // Caller waits for acceptance
    if (isCaller && !callAccepted) {
      console.log('=== VideoCallModal: Caller waiting for acceptance ===');
      setCallStatus('waiting');
      return;
    }

    // Once accepted or if callee, initialize WebRTC
    if (!isCaller || callAccepted) {
      console.log('=== VideoCallModal: Initializing call ===');
      console.log('isCaller:', isCaller, 'callAccepted:', callAccepted);
      console.log('currentUserId:', currentUserId, 'targetUserId:', targetUserId);
      
      setCallStatus('connecting');
      setIsInitialized(true);
      
      const initializeCall = async () => {
        try {
          console.log('=== Creating WebRTCManager ===');
          const manager = new WebRTCManager(
            currentUserId,
            targetUserId,
            conversationId,
            (remoteStream) => {
              console.log('=== Received remote stream ===');
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
                setCallStatus('connected');
              }
            },
            () => {
              console.log('=== Call ended by peer ===');
              setCallStatus('ended');
              onOpenChange(false);
            }
          );

          webrtcManagerRef.current = manager;
          
          console.log('=== Calling manager.initialize() ===');
          await manager.initialize(isCaller);
          console.log('=== manager.initialize() completed ===');

          let localStream: MediaStream;
          if (isCaller) {
            console.log('=== Starting call as caller ===');
            localStream = await manager.startCall(
              videoEnabled,
              selectedDevices?.videoDeviceId,
              selectedDevices?.audioDeviceId
            );
          } else {
            console.log('=== Answering call as callee ===');
            localStream = await manager.answerCall(videoEnabled);
          }

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
            console.log('=== Local stream set to video element ===');
          }
        } catch (error) {
          console.error("=== Error initializing call ===", error);
          setIsInitialized(false);
          onOpenChange(false);
        }
      };

      initializeCall();
    }
  }, [open, currentUserId, targetUserId, conversationId, isCaller, callAccepted, isInitialized]);

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