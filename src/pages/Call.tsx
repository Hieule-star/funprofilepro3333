import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, ArrowLeft, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgora } from "@/hooks/useAgora";
import { getAgoraClient } from "@/lib/agoraClient";
import { useAuth } from "@/contexts/AuthContext";

const Call = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const channelFromUrl = searchParams.get("channel");
  const channelName = channelFromUrl || "funprofile-test";

  const client = getAgoraClient();
  const {
    remoteUsers,
    isJoined,
    isConnecting,
    error,
    join,
    leave,
    toggleAudio,
    toggleVideo,
  } = useAgora({ client });

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Handle audio toggle
  const handleToggleAudio = () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    toggleAudio(newState);
  };

  // Handle video toggle
  const handleToggleVideo = () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    toggleVideo(newState);
  };

  // Handle join call
  const handleJoin = async () => {
    const uid = user?.id ? user.id.substring(0, 8) : undefined;
    await join(channelName, undefined, uid);
  };

  // Handle leave call
  const handleLeave = async () => {
    await leave();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isJoined) {
        leave();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">FUN Profile - Video Call</h1>
              <p className="text-sm text-muted-foreground">
                Channel: <span className="font-mono text-primary">{channelName}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{remoteUsers.length + (isJoined ? 1 : 0)} người trong phòng</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 flex flex-col items-center justify-center gap-6">
        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg mb-4">
            <p className="font-medium">Lỗi kết nối</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Video Grid */}
        <div className="flex flex-wrap gap-4 justify-center items-center">
          {/* Local Video */}
          <div className="relative">
            <div
              id="local-player"
              className="w-80 h-60 bg-muted rounded-xl overflow-hidden border-2 border-primary/50"
            >
              {!isJoined && (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Video của bạn</p>
                  </div>
                </div>
              )}
            </div>
            <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-sm">
              Bạn {!isVideoEnabled && "(Tắt camera)"}
            </div>
          </div>

          {/* Remote Videos */}
          {remoteUsers.map((user) => (
            <div key={user.uid} className="relative">
              <div
                id={`remote-player-${user.uid}`}
                className="w-80 h-60 bg-muted rounded-xl overflow-hidden border-2 border-border"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-sm">
                User {user.uid}
              </div>
            </div>
          ))}

          {/* Placeholder for waiting */}
          {isJoined && remoteUsers.length === 0 && (
            <div className="w-80 h-60 bg-muted/50 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                <p>Đang chờ người khác tham gia...</p>
                <p className="text-xs mt-1">Chia sẻ link này cho bạn bè:</p>
                <code className="text-xs text-primary break-all">
                  {window.location.href}
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-6">
          {!isJoined ? (
            <Button
              onClick={handleJoin}
              disabled={isConnecting}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Đang kết nối...
                </>
              ) : (
                <>
                  <Phone className="h-5 w-5 mr-2" />
                  Tham gia cuộc gọi
                </>
              )}
            </Button>
          ) : (
            <>
              {/* Audio Toggle */}
              <Button
                variant={isAudioEnabled ? "outline" : "destructive"}
                size="lg"
                onClick={handleToggleAudio}
                className="rounded-full w-14 h-14"
              >
                {isAudioEnabled ? (
                  <Mic className="h-6 w-6" />
                ) : (
                  <MicOff className="h-6 w-6" />
                )}
              </Button>

              {/* Video Toggle */}
              <Button
                variant={isVideoEnabled ? "outline" : "destructive"}
                size="lg"
                onClick={handleToggleVideo}
                className="rounded-full w-14 h-14"
              >
                {isVideoEnabled ? (
                  <Video className="h-6 w-6" />
                ) : (
                  <VideoOff className="h-6 w-6" />
                )}
              </Button>

              {/* Leave Call */}
              <Button
                variant="destructive"
                size="lg"
                onClick={handleLeave}
                className="rounded-full w-14 h-14"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {/* Instructions */}
        {!isJoined && (
          <div className="text-center text-muted-foreground max-w-md mt-4">
            <p className="text-sm">
              Nhấn "Tham gia cuộc gọi" để bắt đầu. Bạn có thể mở link này trên thiết bị khác 
              hoặc chia sẻ cho bạn bè để test video call.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Call;
