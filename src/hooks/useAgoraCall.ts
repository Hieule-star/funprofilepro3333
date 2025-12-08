import { useState, useRef, useCallback } from "react";
import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser
} from "agora-rtc-sdk-ng";
import { supabase } from "@/integrations/supabase/client";

interface UseAgoraCallReturn {
  localVideoRef: React.RefObject<HTMLDivElement>;
  remoteVideoRef: React.RefObject<HTMLDivElement>;
  joinChannel: (channelName: string, mode: 'video' | 'audio', videoDeviceId?: string, audioDeviceId?: string) => Promise<void>;
  leaveChannel: () => Promise<void>;
  toggleAudio: (enabled: boolean) => void;
  toggleVideo: (enabled: boolean) => void;
  isJoined: boolean;
  remoteUsers: IAgoraRTCRemoteUser[];
}

export function useAgoraCall(): UseAgoraCallReturn {
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  const joinChannel = useCallback(async (channelName: string, mode: 'video' | 'audio', videoDeviceId?: string, audioDeviceId?: string) => {
    try {
      console.log('[Agora] Joining channel:', channelName, 'mode:', mode);
      
      // 1. Get token from Vercel Token Server
      const VERCEL_TOKEN_SERVER = "https://mkdir-agora-token-server.vercel.app/api/agora-token";
      console.log('[Agora] Fetching token from Vercel Token Server...');

      const tokenResponse = await fetch(VERCEL_TOKEN_SERVER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelName, uid: 0 }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[Agora] Token fetch error:', errorText);
        throw new Error(`Không thể lấy token: ${errorText}`);
      }

      const data = await tokenResponse.json();

      if (!data?.token) {
        throw new Error("Không có token trả về từ server");
      }

      const { token, appId } = data;
      console.log('[Agora] Token fetched successfully from Vercel, appId:', appId);

      // 2. Create Agora client
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      // 3. Setup event handlers
      client.on("user-published", async (user, mediaType) => {
        console.log('[Agora] User published:', user.uid, mediaType);
        await client.subscribe(user, mediaType);
        
        if (mediaType === "video" && remoteVideoRef.current) {
          user.videoTrack?.play(remoteVideoRef.current);
          console.log('[Agora] Playing remote video');
        }
        if (mediaType === "audio") {
          user.audioTrack?.play();
          console.log('[Agora] Playing remote audio');
        }
        
        setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
      });

      client.on("user-unpublished", (user, mediaType) => {
        console.log('[Agora] User unpublished:', user.uid, mediaType);
        if (mediaType === "video") {
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        }
      });

      client.on("user-left", (user) => {
        console.log('[Agora] User left:', user.uid);
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });

      // 4. Join channel
      await client.join(appId, channelName, token, null);
      console.log('[Agora] Joined channel successfully');

      // 5. Create local tracks based on mode
      let audioTrack: IMicrophoneAudioTrack;
      
      audioTrack = await AgoraRTC.createMicrophoneAudioTrack(
        audioDeviceId ? { microphoneId: audioDeviceId } : undefined
      );
      localAudioTrackRef.current = audioTrack;

      const tracksToPublish: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = [audioTrack];

      // Only create video track if mode is 'video'
      if (mode === 'video') {
        const videoTrack = await AgoraRTC.createCameraVideoTrack(
          videoDeviceId ? { cameraId: videoDeviceId } : undefined
        );
        localVideoTrackRef.current = videoTrack;
        tracksToPublish.push(videoTrack);

        // Play local video
        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
          console.log('[Agora] Playing local video');
        }
      } else {
        console.log('[Agora] Audio-only mode, skipping video track');
      }

      // Publish tracks
      await client.publish(tracksToPublish);
      console.log('[Agora] Published local tracks:', mode);

      setIsJoined(true);
    } catch (error) {
      console.error('[Agora] Join error:', error);
      throw error;
    }
  }, []);

  const leaveChannel = useCallback(async () => {
    console.log('[Agora] Leaving channel');
    
    // Stop and close local tracks
    localAudioTrackRef.current?.close();
    localVideoTrackRef.current?.close();
    
    // Leave channel
    await clientRef.current?.leave();
    
    // Reset state
    clientRef.current = null;
    localAudioTrackRef.current = null;
    localVideoTrackRef.current = null;
    setIsJoined(false);
    setRemoteUsers([]);
    
    console.log('[Agora] Left channel successfully');
  }, []);

  const toggleAudio = useCallback((enabled: boolean) => {
    localAudioTrackRef.current?.setEnabled(enabled);
    console.log('[Agora] Audio toggled:', enabled);
  }, []);

  const toggleVideo = useCallback((enabled: boolean) => {
    localVideoTrackRef.current?.setEnabled(enabled);
    console.log('[Agora] Video toggled:', enabled);
  }, []);

  return {
    localVideoRef,
    remoteVideoRef,
    joinChannel,
    leaveChannel,
    toggleAudio,
    toggleVideo,
    isJoined,
    remoteUsers,
  };
}
