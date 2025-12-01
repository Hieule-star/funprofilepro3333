import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface SignalPayload {
  type: 'webrtc-ready' | 'webrtc-offer' | 'webrtc-answer' | 'webrtc-ice-candidate';
  senderId: string;
  data?: any;
}

interface UseWebRTCSignalingReturn {
  sendSignal: (payload: SignalPayload) => void;
  isConnected: boolean;
}

export function useWebRTCSignaling(
  roomId: string | undefined,
  currentUserId: string | undefined,
  onSignal: (payload: SignalPayload) => void
): UseWebRTCSignalingReturn {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isConnectedRef = useRef(false);
  const onSignalRef = useRef(onSignal);

  // Keep callback ref updated
  useEffect(() => {
    onSignalRef.current = onSignal;
  }, [onSignal]);

  // Subscribe to shared room channel
  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const channelName = `webrtc:room-${roomId}`;
    console.log(`[WebRTC] Subscribing to channel: ${channelName}`);
    
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false } // Don't receive own messages
      }
    });

    channel
      .on('broadcast', { event: 'signal' }, (message) => {
        const payload = message.payload as SignalPayload;
        
        // Only process signals from OTHER users
        if (payload.senderId === currentUserId) {
          console.log('[WebRTC] Ignoring own signal');
          return;
        }
        
        console.log(`[WebRTC] Received signal: ${payload.type} from ${payload.senderId}`);
        onSignalRef.current(payload);
      })
      .subscribe((status) => {
        console.log(`[WebRTC] Channel status: ${status}`);
        isConnectedRef.current = status === 'SUBSCRIBED';
      });

    channelRef.current = channel;

    return () => {
      console.log('[WebRTC] Cleaning up channel');
      channel.unsubscribe();
      channelRef.current = null;
      isConnectedRef.current = false;
    };
  }, [roomId, currentUserId]);

  // Send signal to the shared channel
  const sendSignal = useCallback((payload: SignalPayload) => {
    if (!channelRef.current) {
      console.error('[WebRTC] Cannot send signal - channel not connected');
      return;
    }

    const fullPayload: SignalPayload = {
      ...payload,
      senderId: currentUserId || ''
    };

    console.log(`[WebRTC] Sending signal: ${payload.type}`);
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'signal',
      payload: fullPayload
    });
  }, [currentUserId]);

  return {
    sendSignal,
    isConnected: isConnectedRef.current
  };
}
