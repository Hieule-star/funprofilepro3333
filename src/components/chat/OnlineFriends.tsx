import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePresence } from "@/hooks/usePresence";
import { Video, Phone } from "lucide-react";

interface Friend {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface OnlineFriendsProps {
  onFriendClick?: (friendId: string) => void;
  onVideoCall?: (friendId: string) => void;
  onAudioCall?: (friendId: string) => void;
}

export default function OnlineFriends({ 
  onFriendClick, 
  onVideoCall, 
  onAudioCall 
}: OnlineFriendsProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const { toast } = useToast();
  const { isOnline, onlineCount } = usePresence(user?.id);

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
        .limit(20);

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
      const { data: conversationId, error } = await supabase.rpc(
        "create_conversation_with_participants",
        {
          current_user_id: user.id,
          friend_id: friendId,
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

  const handleVideoCall = (friendId: string) => {
    if (onVideoCall) {
      onVideoCall(friendId);
    }
  };

  const handleAudioCall = (friendId: string) => {
    if (onAudioCall) {
      onAudioCall(friendId);
    }
  };

  // Separate online and offline friends
  const onlineFriends = friends.filter((f) => isOnline(f.id));
  const offlineFriends = friends.filter((f) => !isOnline(f.id));

  if (friends.length === 0) return null;

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold mb-3 text-muted-foreground flex items-center gap-2">
        Bạn bè
        {onlineFriends.length > 0 && (
          <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
            {onlineFriends.length} online
          </span>
        )}
      </h3>
      <ScrollArea className="h-48">
        <div className="space-y-1">
          {/* Online friends first */}
          {onlineFriends.map((friend) => (
            <div
              key={friend.id}
              className="w-full flex items-center justify-between hover:bg-accent p-2 rounded-lg transition-colors group"
            >
              <button
                onClick={() => handleCreateConversation(friend.id)}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={friend.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {friend.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                </div>
                <span className="text-sm truncate">{friend.username}</span>
              </button>
              
              {/* Call buttons - visible on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAudioCall(friend.id);
                  }}
                  title="Gọi thoại"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVideoCall(friend.id);
                  }}
                  title="Gọi video"
                >
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Offline friends */}
          {offlineFriends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => handleCreateConversation(friend.id)}
              className="w-full flex items-center gap-2 hover:bg-accent p-2 rounded-lg transition-colors opacity-60"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={friend.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {friend.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gray-400 rounded-full border-2 border-card" />
              </div>
              <span className="text-sm truncate text-muted-foreground">{friend.username}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
