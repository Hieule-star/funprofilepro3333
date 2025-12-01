import { useEffect, useRef, useCallback, useState } from "react";
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
  waitForConnection: () => Promise<void>;
}

export function useWebRTCSignaling(
  roomId: string | undefined,
  currentUserId: string | undefined,
  onSignal: (payload: SignalPayload) => void
): UseWebRTCSignalingReturn {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const connectionResolveRef = useRef<(() => void) | null>(null);
  const onSignalRef = useRef(onSignal);

  // Keep callback ref updated
  useEffect(() => {
    onSignalRef.current = onSignal;
  }, [onSignal]);

  // Subscribe to shared room channel
  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const channelName = `webrtc:room-${roomId}`;
    console.log(`[SIGNAL] subscribe channel`, roomId, currentUserId);
    
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
          console.log('[SIGNAL] Ignoring own signal');
          return;
        }
        
        console.log(`[SIGNAL] received`, payload);
        onSignalRef.current(payload);
      })
      .subscribe((status) => {
        console.log(`[SIGNAL] channel status:`, status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          connectionResolveRef.current?.();
        } else {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[SIGNAL] Cleaning up channel');
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
      connectionResolveRef.current = null;
    };
  }, [roomId, currentUserId]);

  // Wait for connection to be ready
  const waitForConnection = useCallback((): Promise<void> => {
    if (channelRef.current?.state === 'joined') {
      console.log('[SIGNAL] Channel already connected');
      return Promise.resolve();
    }
    console.log('[SIGNAL] Waiting for channel connection...');
    return new Promise((resolve) => {
      connectionResolveRef.current = resolve;
    });
  }, []);

  // Send signal to the shared channel
  const sendSignal = useCallback((payload: SignalPayload) => {
    if (!channelRef.current) {
      console.error('[SIGNAL] Cannot send - channel not connected');
      return;
    }

    const fullPayload: SignalPayload = {
      ...payload,
      senderId: currentUserId || ''
    };

    console.log(`[SIGNAL] sending`, fullPayload);
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'signal',
      payload: fullPayload
    });
  }, [currentUserId]);

  return {
    sendSignal,
    isConnected,
    waitForConnection
  };
}
