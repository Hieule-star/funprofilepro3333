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

    const channel = supabase
      .channel("friend-request-notifications")
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
          
          // Only notify for pending requests
          if (newRequest.status !== "pending") return;

          // Fetch sender's profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", newRequest.user_id)
            .maybeSingle();

          // Play notification sound
          if (audioRef.current) {
            audioRef.current.play().catch(err => console.log('Could not play sound:', err));
          }

          // Show toast notification
          toast({
            title: "👥 Lời mời kết bạn mới",
            description: `${profile?.username || "Ai đó"} muốn kết bạn với bạn`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);
}
