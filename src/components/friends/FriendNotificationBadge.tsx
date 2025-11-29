import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

export default function FriendNotificationBadge() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = async () => {
    if (!user) return;

    const { count } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("friend_id", user.id)
      .eq("status", "pending");

    setPendingCount(count || 0);
  };

  useEffect(() => {
    if (!user) return;

    fetchPendingCount();

    // Real-time subscription for friend requests
    const channel = supabase
      .channel("friendships-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `friend_id=eq.${user.id}`,
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (pendingCount === 0) return null;

  return (
    <Badge
      variant="destructive"
      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
    >
      {pendingCount > 9 ? "9+" : pendingCount}
    </Badge>
  );
}
