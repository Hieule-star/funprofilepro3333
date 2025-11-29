import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserSearchCardProps {
  userId: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  friendshipStatus?: "none" | "pending_sent" | "pending_received" | "accepted";
  onStatusChange: () => void;
}

export default function UserSearchCard({
  userId,
  username,
  avatarUrl,
  bio,
  friendshipStatus = "none",
  onStatusChange,
}: UserSearchCardProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSendRequest = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Lỗi",
          description: "Vui lòng đăng nhập",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("friendships")
        .insert({
          user_id: user.id,
          friend_id: userId,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã gửi lời mời kết bạn",
      });
      
      onStatusChange();
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể gửi lời mời",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("user_id", user.id)
        .eq("friend_id", userId);

      if (error) throw error;

      toast({
        title: "Đã hủy",
        description: "Đã hủy lời mời kết bạn",
      });
      
      onStatusChange();
    } catch (error) {
      console.error("Error canceling request:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarFallback = () => {
    return username.substring(0, 2).toUpperCase();
  };

  const renderButton = () => {
    switch (friendshipStatus) {
      case "accepted":
        return (
          <Button variant="secondary" size="sm" disabled>
            <UserCheck className="h-4 w-4 mr-2" />
            Bạn bè
          </Button>
        );
      case "pending_sent":
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelRequest}
            disabled={loading}
          >
            <Clock className="h-4 w-4 mr-2" />
            Đã gửi
          </Button>
        );
      case "pending_received":
        return (
          <Button variant="secondary" size="sm" disabled>
            Phản hồi
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            onClick={handleSendRequest}
            disabled={loading}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Kết bạn
          </Button>
        );
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            {avatarUrl && <AvatarImage src={avatarUrl} />}
            <AvatarFallback className="bg-primary/10 text-primary">
              {getAvatarFallback()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{username}</p>
            {bio && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {bio}
              </p>
            )}
          </div>
        </div>
        {renderButton()}
      </CardContent>
    </Card>
  );
}
