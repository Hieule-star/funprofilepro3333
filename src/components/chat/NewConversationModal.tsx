import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated?: (conversationId: string) => void;
}

interface Friend {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function NewConversationModal({
  open,
  onOpenChange,
  onConversationCreated,
}: NewConversationModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchFriends();
    }
  }, [open, user]);

  const fetchFriends = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error) {
      console.error("Error fetching friends:", error);
      return;
    }

    const friendIds = data?.map(f => 
      f.user_id === user.id ? f.friend_id : f.user_id
    ) || [];

    if (friendIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", friendIds);

      setFriends(profiles || []);
    } else {
      setFriends([]);
    }
  };

  const createOrOpenConversation = async (friendId: string) => {
    if (!user) return;

    try {
      setLoading(true);

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
            onOpenChange(false);
            if (onConversationCreated) {
              onConversationCreated(participant.conversation_id);
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

      // Add current user first (required for RLS policy)
      const { error: userParticipantError } = await supabase
        .from("conversation_participants")
        .insert({ conversation_id: newConversation.id, user_id: user.id });

      if (userParticipantError) throw userParticipantError;

      // Then add friend (now current user is a participant, has permission)
      const { error: friendParticipantError } = await supabase
        .from("conversation_participants")
        .insert({ conversation_id: newConversation.id, user_id: friendId });

      if (friendParticipantError) throw friendParticipantError;

      toast({
        title: "Thành công",
        description: "Đã tạo cuộc trò chuyện mới",
      });

      onOpenChange(false);
      if (onConversationCreated) {
        onConversationCreated(newConversation.id);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tạo cuộc trò chuyện",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cuộc trò chuyện mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm bạn bè..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[300px] pr-4">
            {filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Không có bạn bè</p>
                <p className="text-sm mt-1">Hãy kết bạn để bắt đầu chat!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFriends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => createOrOpenConversation(friend.id)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {friend.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{friend.username}</span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
