import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OnlineFriendsProps {
  onFriendClick?: (friendId: string) => void;
}

export default function OnlineFriends({ onFriendClick }: OnlineFriendsProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchFriends = async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          friend:profiles!friendships_friend_id_fkey(id, username, avatar_url)
        `)
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .limit(5);

      if (!error && data) {
        setFriends(data.map((f: any) => f.friend));
      }
    };

    fetchFriends();
  }, [user]);

  const handleCreateConversation = async (friendId: string) => {
    if (!user) return;

    try {
      // Check if conversation already exists
      const { data: existingParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (existingParticipants) {
        for (const participant of existingParticipants) {
          const { data: otherParticipants, count } = await supabase
            .from("conversation_participants")
            .select("user_id", { count: "exact" })
            .eq("conversation_id", participant.conversation_id);

          if (count === 2 && otherParticipants?.some(p => p.user_id === friendId)) {
            // Conversation exists
            if (onFriendClick) {
              onFriendClick(participant.conversation_id);
            }
            return;
          }
        }
      }

      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from("conversations")
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: participantError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: newConversation.id, user_id: user.id },
          { conversation_id: newConversation.id, user_id: friendId },
        ]);

      if (participantError) throw participantError;

      if (onFriendClick) {
        onFriendClick(newConversation.id);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  if (friends.length === 0) return null;

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
        Bạn bè đang hoạt động
      </h3>
      <ScrollArea className="h-32">
        <div className="space-y-2">
          {friends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => handleCreateConversation(friend.id)}
              className="w-full flex items-center gap-2 hover:bg-accent p-2 rounded-lg transition-colors"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={friend.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {friend.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
              </div>
              <span className="text-sm truncate">{friend.username}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
