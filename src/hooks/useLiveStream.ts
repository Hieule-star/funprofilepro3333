/**
 * Live Streaming Hook
 * 
 * Manages Agora RTC client for live streaming functionality
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { IAgoraRTCClient, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import {
  createLiveClient,
  joinAsHost,
  joinAsAudience,
  leaveChannel,
  subscribeToUser,
  generateChannelName,
  type LiveTracks,
} from '@/lib/agora-live';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface UseLiveStreamReturn {
  // State
  isLive: boolean;
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
  channelName: string | null;
  remoteUsers: IAgoraRTCRemoteUser[];
  viewerCount: number;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;

  // Refs for video elements
  localVideoRef: React.RefObject<HTMLDivElement>;
  remoteVideoRef: React.RefObject<HTMLDivElement>;

  // Actions
  startLive: () => Promise<string | null>;
  joinLive: (channel: string) => Promise<boolean>;
  leaveLive: () => Promise<void>;
  toggleMic: () => void;
  toggleCamera: () => void;
}

export function useLiveStream(): UseLiveStreamReturn {
  const { user } = useAuth();
  
  // State
  const [isLive, setIsLive] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channelName, setChannelName] = useState<string | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);

  // Refs
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const tracksRef = useRef<LiveTracks | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  // Set up client event handlers
  const setupClientEvents = useCallback((client: IAgoraRTCClient) => {
    client.on('user-published', async (user, mediaType) => {
      if (mediaType !== 'audio' && mediaType !== 'video') return;
      await subscribeToUser(client, user, mediaType);
      
      if (mediaType === 'video' && remoteVideoRef.current) {
        user.videoTrack?.play(remoteVideoRef.current);
      }
      
      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }

      setRemoteUsers(prev => {
        const exists = prev.find(u => u.uid === user.uid);
        if (exists) return prev;
        return [...prev, user];
      });
    });

    client.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'video') {
        user.videoTrack?.stop();
      }
    });

    client.on('user-left', (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    client.on('user-joined', () => {
      setViewerCount(prev => prev + 1);
    });

    client.on('user-left', () => {
      setViewerCount(prev => Math.max(0, prev - 1));
    });

    client.on('connection-state-change', (curState, prevState) => {
      console.log('[useLiveStream] Connection state:', prevState, '->', curState);
      if (curState === 'DISCONNECTED') {
        setIsLive(false);
        setError('Connection lost');
      }
    });
  }, []);

  // Start live as host
  const startLive = useCallback(async (): Promise<string | null> => {
    if (!user?.id) {
      setError('Please login to start a live stream');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session');
      }

      // Create client and channel
      const client = createLiveClient();
      clientRef.current = client;
      setupClientEvents(client);

      const channel = generateChannelName(user.id);
      setChannelName(channel);

      // Join as host
      const { tracks } = await joinAsHost(client, channel, session.access_token);
      tracksRef.current = tracks;

      // Play local video
      if (localVideoRef.current) {
        tracks.videoTrack.play(localVideoRef.current);
      }

      setIsLive(true);
      setIsHost(true);
      setIsLoading(false);

      return channel;
    } catch (err) {
      console.error('[useLiveStream] Start live error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start live');
      setIsLoading(false);
      return null;
    }
  }, [user, setupClientEvents]);

  // Join live as audience
  const joinLive = useCallback(async (channel: string): Promise<boolean> => {
    if (!user?.id) {
      setError('Please login to watch live streams');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session');
      }

      // Create client
      const client = createLiveClient();
      clientRef.current = client;
      setupClientEvents(client);

      setChannelName(channel);

      // Join as audience
      await joinAsAudience(client, channel, session.access_token);

      setIsLive(true);
      setIsHost(false);
      setIsLoading(false);

      return true;
    } catch (err) {
      console.error('[useLiveStream] Join live error:', err);
      setError(err instanceof Error ? err.message : 'Failed to join live');
      setIsLoading(false);
      return false;
    }
  }, [user, setupClientEvents]);

  // Leave live
  const leaveLive = useCallback(async (): Promise<void> => {
    try {
      if (clientRef.current) {
        await leaveChannel(clientRef.current, tracksRef.current || undefined);
        clientRef.current = null;
        tracksRef.current = null;
      }

      setIsLive(false);
      setIsHost(false);
      setChannelName(null);
      setRemoteUsers([]);
      setViewerCount(0);
      setError(null);
    } catch (err) {
      console.error('[useLiveStream] Leave error:', err);
    }
  }, []);

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (tracksRef.current?.audioTrack) {
      const enabled = !isMicEnabled;
      tracksRef.current.audioTrack.setEnabled(enabled);
      setIsMicEnabled(enabled);
    }
  }, [isMicEnabled]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (tracksRef.current?.videoTrack) {
      const enabled = !isCameraEnabled;
      tracksRef.current.videoTrack.setEnabled(enabled);
      setIsCameraEnabled(enabled);
    }
  }, [isCameraEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        leaveChannel(clientRef.current, tracksRef.current || undefined);
      }
    };
  }, []);

  return {
    isLive,
    isHost,
    isLoading,
    error,
    channelName,
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
  };
}
