import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceState {
  user_id: string;
  online_at: string;
}

export function usePresence(userId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Update user's online status in database
  const updateOnlineStatus = useCallback(async (isOnline: boolean) => {
    if (!userId) return;
    
    try {
      await supabase
        .from("profiles")
        .update({ 
          is_online: isOnline, 
          last_seen: new Date().toISOString() 
        })
        .eq("id", userId);
    } catch (error) {
      console.error("Error updating online status:", error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Create presence channel
    const presenceChannel = supabase.channel("online-users", {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState<PresenceState>();
        const userIds = new Set<string>();
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            if (presence.user_id) {
              userIds.add(presence.user_id);
            }
          });
        });
        
        setOnlineUsers(userIds);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track this user's presence
          await presenceChannel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
          
          // Update database
          await updateOnlineStatus(true);
        }
      });

    setChannel(presenceChannel);

    // Handle tab/window close
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline update
      const url = `${import.meta.env.VITE_SUPABASE_URL || "https://krajdsugcvwytpsqnbzs.supabase.co"}/rest/v1/profiles?id=eq.${userId}`;
      const data = JSON.stringify({ is_online: false, last_seen: new Date().toISOString() });
      
      navigator.sendBeacon(url, new Blob([data], { type: "application/json" }));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        updateOnlineStatus(false);
      } else if (document.visibilityState === "visible") {
        updateOnlineStatus(true);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      
      // Update offline status before unsubscribing
      updateOnlineStatus(false);
      presenceChannel.unsubscribe();
    };
  }, [userId, updateOnlineStatus]);

  const isOnline = useCallback((uid: string) => {
    return onlineUsers.has(uid);
  }, [onlineUsers]);

  return { 
    onlineUsers, 
    isOnline,
    onlineCount: onlineUsers.size 
  };
}
