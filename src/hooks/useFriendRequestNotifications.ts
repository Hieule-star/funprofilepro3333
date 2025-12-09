import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useFriendRequestNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;

    // Create audio element for notification sound
    audioRef.current = new Audio('/sounds/message-notification.mp3');

    // Listen for new friend requests (someone sends you a request)
    const incomingChannel = supabase
      .channel("friend-request-incoming")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friendships",
          filter: `friend_id=eq.${user.id}`,
        },
        async (payload) => {
          const newRequest = payload.new as { user_id: string; status: string };
          
          if (newRequest.status !== "pending") return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", newRequest.user_id)
            .maybeSingle();

          if (audioRef.current) {
            audioRef.current.play().catch(err => console.log('Could not play sound:', err));
          }

          toast({
            title: "👥 Lời mời kết bạn mới",
            description: `${profile?.username || "Ai đó"} muốn kết bạn với bạn`,
          });
        }
      )
      .subscribe();

    // Listen for accepted friend requests (someone accepts your request)
    const acceptedChannel = supabase
      .channel("friend-request-accepted")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "friendships",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const updated = payload.new as { friend_id: string; status: string };
          const old = payload.old as { status: string };
          
          // Only notify when status changes to accepted
          if (updated.status !== "accepted" || old.status === "accepted") return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", updated.friend_id)
            .maybeSingle();

          if (audioRef.current) {
            audioRef.current.play().catch(err => console.log('Could not play sound:', err));
          }

          toast({
            title: "🎉 Đã trở thành bạn bè",
            description: `${profile?.username || "Ai đó"} đã chấp nhận lời mời kết bạn của bạn`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(incomingChannel);
      supabase.removeChannel(acceptedChannel);
    };
  }, [user, toast]);
}
