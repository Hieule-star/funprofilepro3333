import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Users, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VideoStage } from './VideoStage';
import { HostControls } from './HostControls';
import { AudienceControls } from './AudienceControls';
import { LiveChat } from './LiveChat';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useLiveContext } from '@/contexts/LiveContext';
import { extractUserIdFromChannel } from '@/lib/agora-live';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LiveRoomProps {
  channel: string;
}

export function LiveRoom({ channel }: LiveRoomProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeLives, removeLive } = useLiveContext();
  const [startTime] = useState(() => new Date());

  // Determine if current user is the host
  const hostId = extractUserIdFromChannel(channel);
  const isHostMode = hostId === user?.id;

  // Find session info
  const session = activeLives.find((l) => l.channelName === channel);

  const {
    isLive,
    isHost,
    isLoading,
    error,
    remoteUsers,
    viewerCount,
    isMicEnabled,
    isCameraEnabled,
    localVideoRef,
    remoteVideoRef,
    startLive,
    joinLive,
    leaveLive,
    toggleMic,
    toggleCamera,
  } = useLiveStream();

  // Join or start live on mount
  useEffect(() => {
    const init = async () => {
      if (isHostMode) {
        // Host: start live if not already
        if (!isLive) {
          const channelName = await startLive();
          if (!channelName) {
            toast.error('Failed to start live stream');
            navigate('/');
          }
        }
      } else {
        // Audience: join the live
        const success = await joinLive(channel);
        if (!success) {
          toast.error('Failed to join live stream');
          navigate('/');
        }
      }
    };

    init();
  }, [channel, isHostMode]);

  // Handle end/leave live
  const handleEnd = async () => {
    await leaveLive();
    if (isHost) {
      removeLive(channel);
    }
    toast.success(isHost ? 'Live stream ended' : 'Left live stream');
    navigate('/');
  };

  // Show error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Live Badge */}
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <Radio className="h-3 w-3" />
            LIVE
          </Badge>

          {/* Host Info */}
          {session && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session.hostAvatarUrl} />
                <AvatarFallback>
                  {session.hostUsername.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{session.hostUsername}</span>
            </div>
          )}

          {/* Viewer Count */}
          <div className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{viewerCount + remoteUsers.length} watching</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Video Area */}
          <div className="lg:col-span-2 space-y-4">
            <VideoStage
              ref={isHost ? localVideoRef : remoteVideoRef}
              isLoading={isLoading}
              isHost={isHost}
              hasVideo={isHost ? isCameraEnabled : remoteUsers.length > 0}
            />

            {/* Controls */}
            <Card className="p-4">
              {isHost ? (
                <HostControls
                  isMicEnabled={isMicEnabled}
                  isCameraEnabled={isCameraEnabled}
                  onToggleMic={toggleMic}
                  onToggleCamera={toggleCamera}
                  onEndLive={handleEnd}
                  startTime={startTime}
                />
              ) : (
                <AudienceControls onLeave={handleEnd} />
              )}
            </Card>
          </div>

          {/* Chat Panel */}
          <Card className="h-[600px] lg:h-auto">
            <LiveChat channelName={channel} />
          </Card>
        </div>
      </div>
    </div>
  );
}
