import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface TypingUser {
  userId: string;
  username: string;
  avatarUrl?: string;
}

export const useTypingIndicator = (
  conversationId: string | null,
  currentUserId: string | undefined
) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channelName = `typing:${conversationId}`;
    const channel = supabase.channel(channelName);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: TypingUser[] = [];

        Object.keys(state).forEach((key) => {
          const presences = state[key];
          presences.forEach((presence: any) => {
            if (presence.userId !== currentUserId && presence.isTyping) {
              users.push({
                userId: presence.userId,
                username: presence.username,
                avatarUrl: presence.avatarUrl,
              });
            }
          });
        });

        setTypingUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          channelRef.current = channel;
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, currentUserId]);

  const setTyping = async (isTyping: boolean, username: string, avatarUrl?: string) => {
    if (!channelRef.current || !currentUserId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (isTyping) {
      // Send typing state
      await channelRef.current.track({
        userId: currentUserId,
        username,
        avatarUrl,
        isTyping: true,
      });

      // Auto-stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.track({
            userId: currentUserId,
            username,
            avatarUrl,
            isTyping: false,
          });
        }
      }, 3000);
    } else {
      // Stop typing
      await channelRef.current.track({
        userId: currentUserId,
        username,
        avatarUrl,
        isTyping: false,
      });
    }
  };

  return { typingUsers, setTyping };
};
