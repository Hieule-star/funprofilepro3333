import { useEffect, useCallback, useState } from "react";
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
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallInvitation | null>(null);
  const [callAccepted, setCallAccepted] = useState<{ callerId: string; conversationId: string } | null>(null);
  const [callRejected, setCallRejected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const callChannel = supabase.channel(`call-signaling-${userId}`);

    // Listen for incoming calls
    callChannel.on('broadcast', { event: 'call-invitation' }, ({ payload }) => {
      console.log('Received call invitation:', payload);
      if (payload.targetUserId === userId) {
        setIncomingCall({
          callerId: payload.callerId,
          callerName: payload.callerName,
          callerAvatar: payload.callerAvatar,
          conversationId: payload.conversationId,
          timestamp: Date.now()
        });
      }
    });

    // Listen for call acceptance
    callChannel.on('broadcast', { event: 'call-accepted' }, ({ payload }) => {
      console.log('Call accepted:', payload);
      if (payload.callerId === userId) {
        setCallAccepted({
          callerId: payload.targetUserId,
          conversationId: payload.conversationId
        });
        setCallRejected(false);
      }
    });

    // Listen for call rejection
    callChannel.on('broadcast', { event: 'call-rejected' }, ({ payload }) => {
      console.log('Call rejected:', payload);
      if (payload.callerId === userId) {
        setCallRejected(true);
        setCallAccepted(null);
      }
    });

    callChannel.subscribe();
    setChannel(callChannel);

    return () => {
      callChannel.unsubscribe();
    };
  }, [userId]);

  const initiateCall = useCallback((targetUserId: string, conversationId: string, callerInfo: { name: string; avatar?: string }) => {
    if (!channel || !userId) return;

    console.log('Initiating call to:', targetUserId);
    setCallRejected(false);
    setCallAccepted(null);

    channel.send({
      type: 'broadcast',
      event: 'call-invitation',
      payload: {
        callerId: userId,
        callerName: callerInfo.name,
        callerAvatar: callerInfo.avatar,
        targetUserId,
        conversationId,
        timestamp: Date.now()
      }
    });
  }, [channel, userId]);

  const acceptCall = useCallback((callerId: string) => {
    if (!channel || !userId || !incomingCall) return;

    console.log('Accepting call from:', callerId);
    
    channel.send({
      type: 'broadcast',
      event: 'call-accepted',
      payload: {
        callerId,
        targetUserId: userId,
        conversationId: incomingCall.conversationId
      }
    });

    setIncomingCall(null);
  }, [channel, userId, incomingCall]);

  const rejectCall = useCallback((callerId: string) => {
    if (!channel || !userId) return;

    console.log('Rejecting call from:', callerId);

    channel.send({
      type: 'broadcast',
      event: 'call-rejected',
      payload: {
        callerId,
        targetUserId: userId
      }
    });

    setIncomingCall(null);
  }, [channel, userId]);

  return {
    initiateCall,
    acceptCall,
    rejectCall,
    incomingCall,
    callAccepted,
    callRejected
  };
};
