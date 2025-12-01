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

interface CallSignalingHook {
  initiateCall: (targetUserId: string, conversationId: string, callerInfo: { name: string; avatar?: string }) => void;
  acceptCall: (callerId: string) => void;
  rejectCall: (callerId: string) => void;
  incomingCall: CallInvitation | null;
  callAccepted: { callerId: string; conversationId: string } | null;
  callRejected: boolean;
}

export const useCallSignaling = (userId: string | undefined): CallSignalingHook => {
  const [myChannel, setMyChannel] = useState<RealtimeChannel | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallInvitation | null>(null);
  const [callAccepted, setCallAccepted] = useState<{ callerId: string; conversationId: string } | null>(null);
  const [callRejected, setCallRejected] = useState(false);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

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
    const channel = supabase.channel(`call-signaling-${userId}`);

    channel.on('broadcast', { event: 'call-invitation' }, ({ payload }) => {
      console.log('Received call invitation:', payload);
      setIncomingCall({
        callerId: payload.callerId,
        callerName: payload.callerName,
        callerAvatar: payload.callerAvatar,
        conversationId: payload.conversationId,
        timestamp: Date.now()
      });
    });

    channel.on('broadcast', { event: 'call-accepted' }, ({ payload }) => {
      console.log('Call accepted:', payload);
      setCallAccepted({
        callerId: payload.accepterId,
        conversationId: payload.conversationId
      });
      setCallRejected(false);
    });

    channel.on('broadcast', { event: 'call-rejected' }, ({ payload }) => {
      console.log('Call rejected:', payload);
      setCallRejected(true);
      setCallAccepted(null);
    });

    channel.subscribe();
    setMyChannel(channel);

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  // Helper: Send to TARGET user's channel
  const sendToUser = useCallback(async (targetUserId: string, event: string, payload: any) => {
    const targetChannel = supabase.channel(`call-signaling-${targetUserId}`);
    
    await targetChannel.subscribe();
    
    await targetChannel.send({
      type: 'broadcast',
      event,
      payload
    });

    // Cleanup after sending
    setTimeout(() => {
      targetChannel.unsubscribe();
    }, 1000);
  }, []);

  const initiateCall = useCallback((targetUserId: string, conversationId: string, callerInfo: { name: string; avatar?: string }) => {
    if (!userId) return;

    console.log('Initiating call to:', targetUserId);
    setCallRejected(false);
    setCallAccepted(null);

    // Send to TARGET user's channel
    sendToUser(targetUserId, 'call-invitation', {
      callerId: userId,
      callerName: callerInfo.name,
      callerAvatar: callerInfo.avatar,
      conversationId,
      timestamp: Date.now()
    });
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
