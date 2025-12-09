import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, User, AlertCircle, CheckCircle2, Wifi } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAgoraCall } from "@/hooks/useAgoraCall";
import { toast } from "sonner";

interface AgoraVideoCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  targetUsername: string;
  mode: 'video' | 'audio';
  selectedVideoDeviceId?: string;
  selectedAudioDeviceId?: string;
}

type CallStatus = 'connecting' | 'waiting' | 'connected' | 'failed' | 'ended';

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
  const [callStatus, setCallStatus] = useState<CallStatus>('connecting');
  const [connectionTime, setConnectionTime] = useState(0);
  const [wasConnected, setWasConnected] = useState(false);
  
  // Track if we've already joined to prevent double-joining
  const hasJoinedRef = useRef(false);
  // Track if we're already ending to prevent multiple executions
  const isEndingRef = useRef(false);
  const isJoiningRef = useRef(false);
  const connectionTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Connection timer to track waiting time
  useEffect(() => {
    if (callStatus === 'waiting') {
      connectionTimerRef.current = setInterval(() => {
        setConnectionTime(prev => prev + 1);
      }, 1000);
    } else {
      if (connectionTimerRef.current) {
        clearInterval(connectionTimerRef.current);
        connectionTimerRef.current = null;
      }
    }
    return () => {
      if (connectionTimerRef.current) {
        clearInterval(connectionTimerRef.current);
      }
    };
  }, [callStatus]);

  // Join channel when modal opens
  useEffect(() => {
    if (open && !hasJoinedRef.current && !isJoiningRef.current) {
      const channelName = `call-${conversationId}`;
      console.log('[AgoraModal] Attempting to join channel:', channelName);
      console.log('[AgoraModal] Devices - video:', selectedVideoDeviceId, 'audio:', selectedAudioDeviceId);
      
      setCallStatus('connecting');
      setConnectionTime(0);
      isJoiningRef.current = true;
      
      joinChannel(channelName, mode, selectedVideoDeviceId, selectedAudioDeviceId)
        .then(() => {
          console.log('[AgoraModal] Joined successfully, waiting for remote user');
          hasJoinedRef.current = true;
          isJoiningRef.current = false;
          setCallStatus('waiting'); // Waiting for the other user to join
        })
        .catch((error) => {
          console.error('[AgoraModal] Join failed:', error);
          isJoiningRef.current = false;
          setCallStatus('failed');
        });
    }
  }, [open, conversationId, mode, selectedVideoDeviceId, selectedAudioDeviceId, joinChannel]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (hasJoinedRef.current) {
        console.log('[AgoraModal] Cleanup: leaving channel');
        leaveChannel();
        hasJoinedRef.current = false;
        isJoiningRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on unmount

  // Update status when remote user joins
  useEffect(() => {
    if (remoteUsers.length > 0) {
      console.log('[AgoraModal] Remote user joined, status -> connected');
      setCallStatus('connected');
      setWasConnected(true);
    }
  }, [remoteUsers]);

  // Detect when remote user leaves after connection was established
  useEffect(() => {
    if (wasConnected && remoteUsers.length === 0 && isJoined && !isEndingRef.current) {
      isEndingRef.current = true;
      console.log('[AgoraModal] Remote user left after connection, ending call');
      setCallStatus('ended');
      toast.info("Đối phương đã kết thúc cuộc gọi");
      
      // Auto close after 2 seconds - no cleanup to prevent timeout cancellation
      setTimeout(async () => {
        console.log('[AgoraModal] Auto closing modal');
        await leaveChannel();
        hasJoinedRef.current = false;
        onOpenChange(false);
      }, 2000);
    }
  }, [wasConnected, remoteUsers.length, isJoined, leaveChannel, onOpenChange]);

  // Format connection time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status indicator config
  const getStatusConfig = () => {
    switch (callStatus) {
      case 'connecting':
        return {
          icon: <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />,
          text: 'Đang kết nối...',
          bgColor: 'bg-yellow-500/20 border-yellow-500/30',
          textColor: 'text-yellow-400'
        };
      case 'waiting':
        return {
          icon: <Wifi className="h-4 w-4 text-blue-400 animate-pulse" />,
          text: `Chờ ${targetUsername} tham gia...`,
          bgColor: 'bg-blue-500/20 border-blue-500/30',
          textColor: 'text-blue-400'
        };
      case 'connected':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-green-400" />,
          text: `Đã kết nối • ${formatTime(connectionTime)}`,
          bgColor: 'bg-green-500/20 border-green-500/30',
          textColor: 'text-green-400'
        };
      case 'failed':
        return {
          icon: <AlertCircle className="h-4 w-4 text-red-400" />,
          text: 'Kết nối thất bại',
          bgColor: 'bg-red-500/20 border-red-500/30',
          textColor: 'text-red-400'
        };
      case 'ended':
        return {
          icon: <PhoneOff className="h-4 w-4 text-gray-400" />,
          text: 'Đối phương đã kết thúc cuộc gọi',
          bgColor: 'bg-gray-500/20 border-gray-500/30',
          textColor: 'text-gray-400'
        };
    }
  };

  const statusConfig = getStatusConfig();

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
      <DialogContent 
        className="max-w-4xl h-[80vh] p-0 overflow-hidden [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
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
          <div className={`absolute top-4 left-4 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 border ${statusConfig.bgColor}`}>
            {statusConfig.icon}
            <p className={`text-sm font-medium ${statusConfig.textColor}`}>
              {statusConfig.text}
            </p>
          </div>

          {/* Failed state retry button */}
          {callStatus === 'failed' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center space-y-4">
              <AlertCircle className="h-16 w-16 text-red-400 mx-auto" />
              <p className="text-white text-lg">Không thể kết nối cuộc gọi</p>
              <p className="text-gray-400 text-sm">Vui lòng kiểm tra kết nối mạng và thử lại</p>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="mt-4"
              >
                Đóng
              </Button>
            </div>
          )}

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
