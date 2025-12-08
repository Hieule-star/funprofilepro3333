import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Call {
  id: string;
  caller_id: string;
  receiver_id: string;
  room_id: string;
  status: "calling" | "accepted" | "rejected" | "ended" | "missed";
  call_type: "video" | "audio";
  started_at: string;
  ended_at: string | null;
  created_at: string;
  caller?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  receiver?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export function useCalls(userId: string | undefined) {
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callHistory, setCallHistory] = useState<Call[]>([]);
  const { toast } = useToast();

  // Subscribe to incoming calls
  useEffect(() => {
    if (!userId) return;

    // Fetch caller info for incoming call
    const fetchCallerInfo = async (call: any) => {
      const { data: callerProfile } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", call.caller_id)
        .single();

      return {
        ...call,
        caller: callerProfile,
      } as Call;
    };

    // Subscribe to new calls where I'm the receiver
    const channel = supabase
      .channel("my-incoming-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          console.log("Incoming call:", payload.new);
          if (payload.new.status === "calling") {
            const callWithCaller = await fetchCallerInfo(payload.new);
            setIncomingCall(callWithCaller);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
        },
        (payload) => {
          const updatedCall = payload.new as Call;
          console.log("Call updated:", updatedCall);

          // If this is the active call and it was ended/rejected
          if (activeCall?.id === updatedCall.id) {
            if (updatedCall.status === "ended" || updatedCall.status === "rejected") {
              setActiveCall(null);
              toast({
                title: updatedCall.status === "ended" ? "Cuộc gọi đã kết thúc" : "Cuộc gọi bị từ chối",
              });
            } else if (updatedCall.status === "accepted") {
              setActiveCall(updatedCall);
            }
          }

          // Clear incoming call if it was updated
          if (incomingCall?.id === updatedCall.id && updatedCall.status !== "calling") {
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, activeCall?.id, incomingCall?.id, toast]);

  // Initiate a call
  const initiateCall = useCallback(
    async (receiverId: string, callType: "video" | "audio" = "video") => {
      if (!userId) {
        toast({
          title: "Lỗi",
          description: "Bạn cần đăng nhập để gọi",
          variant: "destructive",
        });
        return null;
      }

      const roomId = `call-${crypto.randomUUID()}`;

      try {
        const { data, error } = await supabase
          .from("calls")
          .insert({
            caller_id: userId,
            receiver_id: receiverId,
            room_id: roomId,
            call_type: callType,
            status: "calling",
          })
          .select()
          .single();

        if (error) throw error;

        // Fetch receiver info
        const { data: receiverProfile } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", receiverId)
          .single();

        const callWithReceiver = {
          ...data,
          receiver: receiverProfile,
        } as Call;

        setActiveCall(callWithReceiver);
        return callWithReceiver;
      } catch (error: any) {
        console.error("Error initiating call:", error);
        toast({
          title: "Lỗi",
          description: "Không thể bắt đầu cuộc gọi",
          variant: "destructive",
        });
        return null;
      }
    },
    [userId, toast]
  );

  // Accept incoming call
  const acceptCall = useCallback(
    async (callId: string) => {
      try {
        const { data, error } = await supabase
          .from("calls")
          .update({ status: "accepted" })
          .eq("id", callId)
          .select()
          .single();

        if (error) throw error;

        setActiveCall(data as Call);
        setIncomingCall(null);
        return data as Call;
      } catch (error: any) {
        console.error("Error accepting call:", error);
        toast({
          title: "Lỗi",
          description: "Không thể chấp nhận cuộc gọi",
          variant: "destructive",
        });
        return null;
      }
    },
    [toast]
  );

  // Reject incoming call
  const rejectCall = useCallback(
    async (callId: string) => {
      try {
        const { error } = await supabase
          .from("calls")
          .update({ status: "rejected", ended_at: new Date().toISOString() })
          .eq("id", callId);

        if (error) throw error;

        setIncomingCall(null);
        return true;
      } catch (error: any) {
        console.error("Error rejecting call:", error);
        toast({
          title: "Lỗi",
          description: "Không thể từ chối cuộc gọi",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast]
  );

  // End active call
  const endCall = useCallback(
    async (callId: string) => {
      try {
        const { error } = await supabase
          .from("calls")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("id", callId);

        if (error) throw error;

        setActiveCall(null);
        return true;
      } catch (error: any) {
        console.error("Error ending call:", error);
        toast({
          title: "Lỗi",
          description: "Không thể kết thúc cuộc gọi",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast]
  );

  // Fetch call history
  const fetchCallHistory = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("calls")
        .select(`
          *,
          caller:profiles!calls_caller_id_fkey(id, username, avatar_url),
          receiver:profiles!calls_receiver_id_fkey(id, username, avatar_url)
        `)
        .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setCallHistory(data as Call[]);
    } catch (error) {
      console.error("Error fetching call history:", error);
    }
  }, [userId]);

  // Clear incoming call (for timeout/missed)
  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  // Clear active call
  const clearActiveCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  return {
    incomingCall,
    activeCall,
    callHistory,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    fetchCallHistory,
    clearIncomingCall,
    clearActiveCall,
  };
}
