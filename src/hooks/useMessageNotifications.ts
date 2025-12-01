import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const useMessageNotifications = () => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;

    // Initialize audio element (using celebration sound as notification)
    audioRef.current = new Audio('/sounds/celebration.mp3');
    audioRef.current.volume = 0.3;

    const channel = supabase
      .channel("message-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new as any;

          // Ignore messages sent by current user
          if (newMessage.sender_id === user.id) return;

          // Check if user is part of this conversation
          const { data: participation } = await supabase
            .from("conversation_participants")
            .select("id")
            .eq("conversation_id", newMessage.conversation_id)
            .eq("user_id", user.id)
            .single();

          if (!participation) return;

          // Fetch sender info
          const { data: sender } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", newMessage.sender_id)
            .single();

          // Play notification sound
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(console.error);
          }

          // Show toast notification with message preview
          const messagePreview = newMessage.media_url 
            ? newMessage.media_type === "image" ? "📷 Đã gửi hình ảnh"
              : newMessage.media_type === "video" ? "🎥 Đã gửi video"
              : "📎 Đã gửi tệp đính kèm"
            : newMessage.content?.substring(0, 50) + (newMessage.content?.length > 50 ? "..." : "");

          toast.info(`💬 ${sender?.username || "Người dùng"}`, {
            description: messagePreview,
            duration: 5000,
            action: {
              label: "Xem",
              onClick: () => {
                window.location.href = "/chat";
              },
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
};
