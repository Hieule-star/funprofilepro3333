import { useState, useEffect, useCallback, useRef } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import { supabase } from "@/integrations/supabase/client";

type IRemoteUser = IAgoraRTCRemoteUser;

interface UseAgoraOptions {
  client: IAgoraRTCClient;
}

interface UseAgoraReturn {
  localAudioTrack: IMicrophoneAudioTrack | null;
  localVideoTrack: ICameraVideoTrack | null;
  remoteUsers: IRemoteUser[];
  isJoined: boolean;
  isConnecting: boolean;
  error: string | null;
  join: (channelName?: string, token?: string, uid?: string | number) => Promise<void>;
  leave: () => Promise<void>;
  toggleAudio: (enabled: boolean) => void;
  toggleVideo: (enabled: boolean) => void;
}

export function useAgora({ client }: UseAgoraOptions): UseAgoraReturn {
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IRemoteUser[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);

  // Handle remote user published
  const handleUserPublished = useCallback(
    async (user: IRemoteUser, mediaType: "audio" | "video") => {
      console.log("[Agora] User published:", user.uid, mediaType);
      await client.subscribe(user, mediaType);

      if (mediaType === "video") {
        // 1. Add user to state FIRST so React renders the DOM element
        setRemoteUsers((prev) => {
          const filtered = prev.filter((u) => u.uid !== user.uid);
          return [...filtered, user];
        });

        // 2. Wait for React to render DOM element, then play video
        requestAnimationFrame(() => {
          setTimeout(() => {
            const remotePlayerElement = document.getElementById(`remote-player-${user.uid}`);
            if (remotePlayerElement && user.videoTrack) {
              user.videoTrack.play(remotePlayerElement);
              console.log("[Agora] Playing remote video for user:", user.uid);
            } else {
              console.warn("[Agora] Element not found for user:", user.uid, "- will retry via useEffect");
            }
          }, 100);
        });
      }

      if (mediaType === "audio" && user.audioTrack) {
        user.audioTrack.play();
        console.log("[Agora] Playing remote audio for user:", user.uid);
      }
    },
    [client]
  );

  // Handle remote user unpublished
  const handleUserUnpublished = useCallback(
    (user: IRemoteUser, mediaType: "audio" | "video") => {
      console.log("[Agora] User unpublished:", user.uid, mediaType);
      if (mediaType === "video") {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      }
    },
    []
  );

  // Handle remote user left
  const handleUserLeft = useCallback((user: IRemoteUser) => {
    console.log("[Agora] User left:", user.uid);
    setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
  }, []);

  // Setup event listeners
  useEffect(() => {
    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("user-left", handleUserLeft);

    return () => {
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
      client.off("user-left", handleUserLeft);
    };
  }, [client, handleUserPublished, handleUserUnpublished, handleUserLeft]);

  // Join channel
  const join = useCallback(
    async (channelName?: string, token?: string, uid?: string | number) => {
      if (isJoined) {
        console.log("[Agora] Already joined, skipping");
        return;
      }

      setIsConnecting(true);
      setError(null);

      try {
        // Default channel name
        const channel = channelName || "funprofile-test";
        console.log("[Agora] Joining channel:", channel);

        // Fetch fresh token from Vercel Token Server
        const VERCEL_TOKEN_SERVER = "https://mkdir-agora-token-server.vercel.app/api/agora-token";
        console.log("[Agora] Fetching token from Vercel Token Server...");
        
        const tokenResponse = await fetch(VERCEL_TOKEN_SERVER, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelName: channel, uid: uid || 0 }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error("[Agora] Token fetch error:", errorText);
          throw new Error(`Không thể lấy token: ${errorText}`);
        }

        const data = await tokenResponse.json();
        
        if (!data?.token) {
          throw new Error("Không có token trả về từ server");
        }

        const appId = data.appId;
        const agoraToken = token || data.token;

        // ===== DEBUG LOGGING =====
        console.log("[Agora] ===== DEBUG INFO =====");
        console.log("[Agora] Token fetched from Vercel Token Server");
        console.log("[Agora] AGORA APP_ID =", appId);
        console.log("[Agora] AGORA TOKEN =", agoraToken?.substring(0, 30) + "...");
        console.log("[Agora] AGORA CHANNEL =", channel);
        console.log("[Agora] ===== END DEBUG =====");

        if (!appId || appId.length !== 32) {
          throw new Error(`App ID không hợp lệ: ${appId}`);
        }

        // Join the channel
        console.log("[Agora] Calling client.join with appId:", appId.substring(0, 8) + "...");
        await client.join(appId, channel, agoraToken, uid || null);
        console.log("[Agora] Joined channel successfully");

        // Create local audio track
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioTrackRef.current = audioTrack;
        setLocalAudioTrack(audioTrack);
        console.log("[Agora] Created audio track");

        // Create local video track
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoTrackRef.current = videoTrack;
        setLocalVideoTrack(videoTrack);
        console.log("[Agora] Created video track");

        // Play local video in element with id "local-player"
        const localPlayerElement = document.getElementById("local-player");
        if (localPlayerElement) {
          videoTrack.play(localPlayerElement);
          console.log("[Agora] Playing local video");
        }

        // Publish tracks
        await client.publish([audioTrack, videoTrack]);
        console.log("[Agora] Published local tracks");

        setIsJoined(true);
      } catch (err) {
        console.error("[Agora] Join error:", err);
        setError(err instanceof Error ? err.message : "Lỗi kết nối cuộc gọi");
      } finally {
        setIsConnecting(false);
      }
    },
    [client, isJoined]
  );

  // Leave channel
  const leave = useCallback(async () => {
    console.log("[Agora] Leaving channel...");

    // Stop and close local tracks
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current.close();
      localAudioTrackRef.current = null;
      setLocalAudioTrack(null);
    }

    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current.close();
      localVideoTrackRef.current = null;
      setLocalVideoTrack(null);
    }

    // Leave the channel
    if (client.connectionState === "CONNECTED") {
      await client.leave();
    }

    // Clear state
    setRemoteUsers([]);
    setIsJoined(false);
    setError(null);

    console.log("[Agora] Left channel successfully");
  }, [client]);

  // Toggle audio
  const toggleAudio = useCallback((enabled: boolean) => {
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.setEnabled(enabled);
      console.log("[Agora] Audio toggled:", enabled);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback((enabled: boolean) => {
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.setEnabled(enabled);
      console.log("[Agora] Video toggled:", enabled);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
      }
    };
  }, []);

  return {
    localAudioTrack,
    localVideoTrack,
    remoteUsers,
    isJoined,
    isConnecting,
    error,
    join,
    leave,
    toggleAudio,
    toggleVideo,
  };
}
