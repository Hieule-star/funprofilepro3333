import { useEffect, useCallback, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface CallInvitation {
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  conversationId: string;
  timestamp: number;
}

export interface CallSignalingHook {
  initiateCall: (targetUserId: string, conversationId: string, callerInfo: { name: string; avatar?: string }) => Promise<boolean>;
  acceptCall: (callerId: string) => void;
  rejectCall: (callerId: string) => void;
  incomingCall: CallInvitation | null;
  callAccepted: { callerId: string; conversationId: string } | null;
  callRejected: boolean;
}

export const useCallSignaling = (userId: string | undefined): CallSignalingHook => {
  const [incomingCall, setIncomingCall] = useState<CallInvitation | null>(null);
  const [callAccepted, setCallAccepted] = useState<{ callerId: string; conversationId: string } | null>(null);
  const [callRejected, setCallRejected] = useState(false);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const outgoingChannelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  // Play ringtone when incoming call
  useEffect(() => {
    if (incomingCall) {
      ringtoneRef.current = new Audio('/sounds/message-notification.mp3');
      ringtoneRef.current.loop = true;
      ringtoneRef.current.volume = 0.5;
      ringtoneRef.current.play().catch(console.error);
    } else {
      ringtoneRef.current?.pause();
      ringtoneRef.current = null;
    }
    
    return () => {
      ringtoneRef.current?.pause();
    };
  }, [incomingCall]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to MY OWN channel to RECEIVE messages
    const myChannel = supabase.channel(`call-signaling-${userId}`);

    myChannel.on('broadcast', { event: 'call-invitation' }, ({ payload }) => {
      console.log('Received call invitation:', payload);
      setIncomingCall({
        callerId: payload.callerId,
        callerName: payload.callerName,
        callerAvatar: payload.callerAvatar,
        conversationId: payload.conversationId,
        timestamp: Date.now()
      });
    });

    myChannel.on('broadcast', { event: 'call-accepted' }, ({ payload }) => {
      console.log('Call accepted:', payload);
      setCallAccepted({
        callerId: payload.accepterId,
        conversationId: payload.conversationId
      });
      setCallRejected(false);
    });

    myChannel.on('broadcast', { event: 'call-rejected' }, ({ payload }) => {
      console.log('Call rejected:', payload);
      setCallRejected(true);
      setCallAccepted(null);
    });

    myChannel.subscribe((status) => {
      console.log(`[MyChannel ${userId}] Status:`, status);
    });

    return () => {
      myChannel.unsubscribe();
    };
  }, [userId]);

  // Helper: Send to TARGET user's channel with retry mechanism
  const sendToUser = useCallback(async (targetUserId: string, event: string, payload: any): Promise<boolean> => {
    // Check if we already have a channel to this user
    let targetChannel = outgoingChannelsRef.current.get(targetUserId);
    
    if (!targetChannel) {
      targetChannel = supabase.channel(`call-signaling-${targetUserId}`);
      outgoingChannelsRef.current.set(targetUserId, targetChannel);
    }
    
    // Wait for subscription with retry
    const subscribeWithRetry = async (retries = 3): Promise<boolean> => {
      for (let i = 0; i < retries; i++) {
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
            
            const currentStatus = targetChannel!.state;
            if (currentStatus === 'joined') {
              clearTimeout(timeout);
              resolve();
              return;
            }
            
            targetChannel!.subscribe((status) => {
              console.log(`[sendToUser] Attempt ${i+1} - Channel status for ${targetUserId}:`, status);
              if (status === 'SUBSCRIBED') {
                clearTimeout(timeout);
                resolve();
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                clearTimeout(timeout);
                reject(new Error(status));
              }
            });
          });
          
          // Wait extra time for connection to stabilize
          await new Promise(resolve => setTimeout(resolve, 500));
          return true;
        } catch (error) {
          console.log(`[sendToUser] Retry ${i+1} failed:`, error);
          if (i === retries - 1) return false;
        }
      }
      return false;
    };
    
    const success = await subscribeWithRetry();
    if (!success) {
      console.error('[sendToUser] Failed to subscribe after retries');
      return false;
    }
    
    // Send message
    console.log(`[sendToUser] Sending ${event} to ${targetUserId}`);
    const result = await targetChannel.send({
      type: 'broadcast',
      event,
      payload
    });
    
    console.log(`[sendToUser] Send result:`, result);
    
    // Keep channel alive for response (30 seconds)
    setTimeout(() => {
      const channel = outgoingChannelsRef.current.get(targetUserId);
      if (channel) {
        console.log(`[sendToUser] Cleaning up channel for ${targetUserId}`);
        channel.unsubscribe();
        outgoingChannelsRef.current.delete(targetUserId);
      }
    }, 30000);
    
    return true;
  }, []);

  const initiateCall = useCallback(async (targetUserId: string, conversationId: string, callerInfo: { name: string; avatar?: string }): Promise<boolean> => {
    if (!userId) return false;

    console.log('Initiating call to:', targetUserId);
    setCallRejected(false);
    setCallAccepted(null);

    // Send to TARGET user's channel
    const success = await sendToUser(targetUserId, 'call-invitation', {
      callerId: userId,
      callerName: callerInfo.name,
      callerAvatar: callerInfo.avatar,
      conversationId,
      timestamp: Date.now()
    });
    
    return success;
  }, [userId, sendToUser]);

  const acceptCall = useCallback((callerId: string) => {
    if (!userId || !incomingCall) return;

    console.log('Accepting call from:', callerId);
    
    // Send acceptance back to CALLER's channel
    sendToUser(callerId, 'call-accepted', {
      accepterId: userId,
      conversationId: incomingCall.conversationId
    });

    setIncomingCall(null);
  }, [userId, incomingCall, sendToUser]);

  const rejectCall = useCallback((callerId: string) => {
    if (!userId) return;

    console.log('Rejecting call from:', callerId);

    // Send rejection back to CALLER's channel
    sendToUser(callerId, 'call-rejected', {
      rejecterId: userId
    });

    setIncomingCall(null);
  }, [userId, sendToUser]);

  return {
    initiateCall,
    acceptCall,
    rejectCall,
    incomingCall,
    callAccepted,
    callRejected
  };
};
