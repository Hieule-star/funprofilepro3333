import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAgoraCall } from "@/hooks/useAgoraCall";

interface AgoraVideoCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  targetUsername: string;
  mode: 'video' | 'audio';
  selectedVideoDeviceId?: string;
  selectedAudioDeviceId?: string;
}

export default function AgoraVideoCallModal({
  open,
  onOpenChange,
  conversationId,
  targetUsername,
  mode,
  selectedVideoDeviceId,
  selectedAudioDeviceId,
}: AgoraVideoCallModalProps) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  
  // Track if we've already joined to prevent double-joining
  const hasJoinedRef = useRef(false);
  const isJoiningRef = useRef(false);

  const {
    localVideoRef,
    remoteVideoRef,
    joinChannel,
    leaveChannel,
    toggleAudio,
    toggleVideo,
    isJoined,
    remoteUsers,
  } = useAgoraCall();

  // Join channel when modal opens
  useEffect(() => {
    if (open && !hasJoinedRef.current && !isJoiningRef.current) {
      const channelName = `call-${conversationId}`;
      console.log('[AgoraModal] Attempting to join channel:', channelName);
      console.log('[AgoraModal] Devices - video:', selectedVideoDeviceId, 'audio:', selectedAudioDeviceId);
      
      setCallStatus('connecting');
      isJoiningRef.current = true;
      
      joinChannel(channelName, mode, selectedVideoDeviceId, selectedAudioDeviceId)
        .then(() => {
          console.log('[AgoraModal] Joined successfully');
          hasJoinedRef.current = true;
          isJoiningRef.current = false;
        })
        .catch((error) => {
          console.error('[AgoraModal] Join failed:', error);
          isJoiningRef.current = false;
          onOpenChange(false);
        });
    }
  }, [open, conversationId, mode, selectedVideoDeviceId, selectedAudioDeviceId, joinChannel, onOpenChange]);

  // Cleanup when modal closes
  useEffect(() => {
    return () => {
      if (hasJoinedRef.current) {
        console.log('[AgoraModal] Cleanup: leaving channel');
        leaveChannel();
        hasJoinedRef.current = false;
        isJoiningRef.current = false;
      }
    };
  }, [leaveChannel]);

  // Update status when remote user joins
  useEffect(() => {
    if (remoteUsers.length > 0) {
      console.log('[AgoraModal] Remote user joined, status -> connected');
      setCallStatus('connected');
    }
  }, [remoteUsers]);

  const handleToggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    toggleAudio(newState);
  };

  const handleToggleVideo = () => {
    const newState = !videoEnabled;
    setVideoEnabled(newState);
    toggleVideo(newState);
  };

  const handleEndCall = async () => {
    await leaveChannel();
    setCallStatus('ended');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden">
        <div className="relative w-full h-full bg-gradient-to-br from-gray-900 to-gray-800">
          {mode === 'video' ? (
            <>
              {/* Remote video */}
              <div 
                ref={remoteVideoRef} 
                className="w-full h-full bg-gray-800"
              />

              {/* Local video - Picture in Picture */}
              <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
                <div 
                  ref={localVideoRef} 
                  className="w-full h-full"
                />
              </div>
            </>
          ) : (
            /* Audio-only mode - Show avatar */
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-6">
                <Avatar className="h-32 w-32 mx-auto border-4 border-primary/20">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary/10 text-primary text-4xl">
                    <User className="h-16 w-16" />
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-white">{targetUsername}</h3>
                  <p className="text-muted-foreground">Cuộc gọi thoại</p>
                </div>
              </div>
            </div>
          )}

          {/* Status indicator */}
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
            {callStatus === 'connecting' && (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            )}
            {callStatus === 'connected' && (
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
            <p className="text-white text-sm font-medium">
              {callStatus === 'connecting' && `Đang kết nối với ${targetUsername}...`}
              {callStatus === 'connected' && `Đang gọi ${targetUsername}`}
              {callStatus === 'ended' && 'Cuộc gọi đã kết thúc'}
            </p>
          </div>

          {/* Debug info */}
          <div className="absolute bottom-24 left-4 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-mono space-y-1">
            <div className="text-gray-400">
              Channel: call-{conversationId.slice(0, 8)}...
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Agora:</span>
              <span className={`font-bold ${isJoined ? 'text-green-400' : 'text-yellow-400'}`}>
                {isJoined ? 'joined' : 'joining...'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Remote:</span>
              <span className={`font-bold ${remoteUsers.length > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {remoteUsers.length} user(s)
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <Button
              variant={audioEnabled ? "secondary" : "destructive"}
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={handleToggleAudio}
            >
              {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </Button>

            {mode === 'video' && (
              <Button
                variant={videoEnabled ? "secondary" : "destructive"}
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={handleToggleVideo}
              >
                {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
              </Button>
            )}

            <Button
              variant="destructive"
              size="icon"
              className="h-16 w-16 rounded-full"
              onClick={handleEndCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
