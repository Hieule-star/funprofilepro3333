/**
 * Agora Live Streaming Library
 * 
 * Provides helpers for creating and managing Agora RTC clients
 * in "live" mode for livestreaming functionality.
 */

import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  ICameraVideoTrack,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';

// Disable Agora logs in production
AgoraRTC.setLogLevel(import.meta.env.DEV ? 0 : 4);

export interface TokenResponse {
  success: boolean;
  data?: {
    appId: string;
    token: string;
    channel: string;
    uid: number;
    expiresAt: number;
  };
  error?: string;
}

export interface LiveTracks {
  audioTrack: IMicrophoneAudioTrack;
  videoTrack: ICameraVideoTrack;
}

/**
 * Create an Agora client configured for live streaming
 */
export function createLiveClient(): IAgoraRTCClient {
  return AgoraRTC.createClient({
    mode: 'live',
    codec: 'vp8',
  });
}

/**
 * Fetch RTC token from the token server
 */
export async function fetchLiveToken(
  channel: string,
  role: 'host' | 'audience',
  accessToken: string
): Promise<TokenResponse> {
  const tokenServerUrl = import.meta.env.VITE_AGORA_TOKEN_SERVER_URL;
  
  if (!tokenServerUrl) {
    return {
      success: false,
      error: 'Token server URL not configured (VITE_AGORA_TOKEN_SERVER_URL)',
    };
  }

  try {
    const response = await fetch(`${tokenServerUrl}/agora/rtc-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, role }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Token request failed: ${response.status}`,
      };
    }

    return data as TokenResponse;
  } catch (error) {
    console.error('[agora-live] Token fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Create local audio and video tracks
 */
export async function createLocalTracks(): Promise<LiveTracks> {
  const [audioTrack, videoTrack] = await Promise.all([
    AgoraRTC.createMicrophoneAudioTrack({
      encoderConfig: 'music_standard',
    }),
    AgoraRTC.createCameraVideoTrack({
      encoderConfig: {
        width: 720,
        height: 1280,
        frameRate: 30,
        bitrateMax: 1500,
      },
      facingMode: 'user',
    }),
  ]);

  return { audioTrack, videoTrack };
}

/**
 * Join a channel as host
 */
export async function joinAsHost(
  client: IAgoraRTCClient,
  channel: string,
  accessToken: string
): Promise<{ tracks: LiveTracks; uid: number }> {
  // Fetch token for host role
  const tokenResponse = await fetchLiveToken(channel, 'host', accessToken);
  
  if (!tokenResponse.success || !tokenResponse.data) {
    throw new Error(tokenResponse.error || 'Failed to fetch token');
  }

  const { appId, token, uid } = tokenResponse.data;

  // Set role to host (broadcaster)
  await client.setClientRole('host');

  // Join the channel
  await client.join(appId, channel, token, uid);

  // Create and publish local tracks
  const tracks = await createLocalTracks();
  await client.publish([tracks.audioTrack, tracks.videoTrack]);

  console.log('[agora-live] Joined as host:', { channel, uid });

  return { tracks, uid };
}

/**
 * Join a channel as audience
 */
export async function joinAsAudience(
  client: IAgoraRTCClient,
  channel: string,
  accessToken: string
): Promise<{ uid: number }> {
  // Fetch token for audience role
  const tokenResponse = await fetchLiveToken(channel, 'audience', accessToken);
  
  if (!tokenResponse.success || !tokenResponse.data) {
    throw new Error(tokenResponse.error || 'Failed to fetch token');
  }

  const { appId, token, uid } = tokenResponse.data;

  // Set role to audience
  await client.setClientRole('audience');

  // Join the channel
  await client.join(appId, channel, token, uid);

  console.log('[agora-live] Joined as audience:', { channel, uid });

  return { uid };
}

/**
 * Leave the channel and clean up
 */
export async function leaveChannel(
  client: IAgoraRTCClient,
  tracks?: LiveTracks
): Promise<void> {
  // Stop and close local tracks
  if (tracks) {
    tracks.audioTrack.stop();
    tracks.audioTrack.close();
    tracks.videoTrack.stop();
    tracks.videoTrack.close();
  }

  // Leave the channel
  await client.leave();

  console.log('[agora-live] Left channel');
}

/**
 * Subscribe to a remote user's tracks
 */
export async function subscribeToUser(
  client: IAgoraRTCClient,
  user: IAgoraRTCRemoteUser,
  mediaType: 'audio' | 'video'
): Promise<void> {
  await client.subscribe(user, mediaType);
  console.log('[agora-live] Subscribed to user:', user.uid, mediaType);
}

/**
 * Generate a channel name for a live session
 */
export function generateChannelName(userId: string): string {
  const timestamp = Date.now();
  return `feed_live_${userId}_${timestamp}`;
}

/**
 * Extract user ID from channel name
 */
export function extractUserIdFromChannel(channelName: string): string | null {
  const match = channelName.match(/^feed_live_([^_]+)_/);
  return match ? match[1] : null;
}
