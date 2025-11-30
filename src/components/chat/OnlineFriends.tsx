import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface OnlineFriendsProps {
  onFriendClick?: (friendId: string) => void;
}

export default function OnlineFriends({ onFriendClick }: OnlineFriendsProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const { toast } = useToast();

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
    if (!user) {
      toast({
        title: "Lỗi xác thực",
        description: "Bạn cần đăng nhập để sử dụng tính năng chat.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use RPC function to create conversation with participants
      const { data: conversationId, error } = await supabase.rpc(
        'create_conversation_with_participants',
        {
          current_user_id: user.id,
          friend_id: friendId
        }
      );

      if (error) throw error;

      onFriendClick?.(conversationId);
      
      toast({
        title: "Đã tạo cuộc trò chuyện",
        description: "Bắt đầu chat ngay!",
      });
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Lỗi tạo cuộc trò chuyện",
        description: error?.message || "Không thể tạo cuộc trò chuyện. Vui lòng thử lại.",
        variant: "destructive",
      });
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
