import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface WebRTCSignal {
  type: 'webrtc-offer' | 'webrtc-answer' | 'webrtc-ice-candidate' | 'webrtc-ready';
  senderId: string;
  targetId: string;
  data?: any;
}

interface WebRTCSignalingHook {
  sendOffer: (offer: RTCSessionDescriptionInit) => void;
  sendAnswer: (answer: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (candidate: RTCIceCandidateInit) => void;
  sendReady: () => void;
  onOffer?: (offer: RTCSessionDescriptionInit) => void;
  onAnswer?: (answer: RTCSessionDescriptionInit) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onReady?: () => void;
}

export function useWebRTCSignaling(
  currentUserId: string,
  targetUserId: string,
  conversationId: string,
  enabled: boolean = true
): WebRTCSignalingHook {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onOfferRef = useRef<((offer: RTCSessionDescriptionInit) => void) | undefined>();
  const onAnswerRef = useRef<((answer: RTCSessionDescriptionInit) => void) | undefined>();
  const onIceCandidateRef = useRef<((candidate: RTCIceCandidateInit) => void) | undefined>();
  const onReadyRef = useRef<(() => void) | undefined>();

  useEffect(() => {
    if (!enabled || !currentUserId) return;

    const channelName = `webrtc-signaling-${currentUserId}`;
    console.log(`=== Subscribing to WebRTC signaling channel: ${channelName} ===`);
    
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'webrtc-signal' }, (payload: any) => {
        const signal = payload.payload as WebRTCSignal;
        
        // Only process signals meant for this user
        if (signal.targetId !== currentUserId) return;
        
        console.log(`=== Received WebRTC signal: ${signal.type} from ${signal.senderId} ===`);

        switch (signal.type) {
          case 'webrtc-offer':
            onOfferRef.current?.(signal.data);
            break;
          case 'webrtc-answer':
            onAnswerRef.current?.(signal.data);
            break;
          case 'webrtc-ice-candidate':
            onIceCandidateRef.current?.(signal.data);
            break;
          case 'webrtc-ready':
            onReadyRef.current?.();
            break;
        }
      })
      .subscribe((status) => {
        console.log(`=== WebRTC signaling channel status: ${status} ===`);
      });

    channelRef.current = channel;

    return () => {
      console.log('=== Cleaning up WebRTC signaling channel ===');
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [currentUserId, enabled]);

  const sendSignal = useCallback(async (signal: WebRTCSignal) => {
    const targetChannelName = `webrtc-signaling-${signal.targetId}`;
    console.log(`=== Sending ${signal.type} to ${targetChannelName} ===`);
    
    const targetChannel = supabase.channel(targetChannelName);
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        targetChannel.unsubscribe();
        reject(new Error('Signal send timeout'));
      }, 5000);

      targetChannel
        .on('broadcast', { event: 'webrtc-signal' }, () => {})
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            try {
              await targetChannel.send({
                type: 'broadcast',
                event: 'webrtc-signal',
                payload: signal
              });
              console.log(`=== Signal ${signal.type} sent successfully ===`);
              clearTimeout(timeout);
              // Keep channel alive for 30 seconds for potential responses
              setTimeout(() => {
                targetChannel.unsubscribe();
              }, 30000);
              resolve();
            } catch (error) {
              clearTimeout(timeout);
              targetChannel.unsubscribe();
              reject(error);
            }
          }
        });
    });
  }, []);

  const sendOffer = useCallback((offer: RTCSessionDescriptionInit) => {
    sendSignal({
      type: 'webrtc-offer',
      senderId: currentUserId,
      targetId: targetUserId,
      data: offer
    });
  }, [currentUserId, targetUserId, sendSignal]);

  const sendAnswer = useCallback((answer: RTCSessionDescriptionInit) => {
    sendSignal({
      type: 'webrtc-answer',
      senderId: currentUserId,
      targetId: targetUserId,
      data: answer
    });
  }, [currentUserId, targetUserId, sendSignal]);

  const sendIceCandidate = useCallback((candidate: RTCIceCandidateInit) => {
    sendSignal({
      type: 'webrtc-ice-candidate',
      senderId: currentUserId,
      targetId: targetUserId,
      data: candidate
    });
  }, [currentUserId, targetUserId, sendSignal]);

  const sendReady = useCallback(() => {
    console.log('=== Callee sending ready signal ===');
    sendSignal({
      type: 'webrtc-ready',
      senderId: currentUserId,
      targetId: targetUserId
    });
  }, [currentUserId, targetUserId, sendSignal]);

  return {
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendReady,
    set onOffer(callback: ((offer: RTCSessionDescriptionInit) => void) | undefined) {
      onOfferRef.current = callback;
    },
    set onAnswer(callback: ((answer: RTCSessionDescriptionInit) => void) | undefined) {
      onAnswerRef.current = callback;
    },
    set onIceCandidate(callback: ((candidate: RTCIceCandidateInit) => void) | undefined) {
      onIceCandidateRef.current = callback;
    },
    set onReady(callback: (() => void) | undefined) {
      onReadyRef.current = callback;
    }
  };
}
