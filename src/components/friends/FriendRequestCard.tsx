import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface FriendRequestCardProps {
  requestId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  onUpdate: () => void;
}

export default function FriendRequestCard({
  requestId,
  userId,
  username,
  avatarUrl,
  bio,
  createdAt,
  onUpdate,
}: FriendRequestCardProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAccept = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Đã chấp nhận",
        description: `Bạn và ${username} đã là bạn bè`,
      });
      
      onUpdate();
    } catch (error) {
      console.error("Error accepting request:", error);
      toast({
        title: "Lỗi",
        description: "Không thể chấp nhận lời mời",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Đã từ chối",
        description: "Đã từ chối lời mời kết bạn",
      });
      
      onUpdate();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Lỗi",
        description: "Không thể từ chối lời mời",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvatarFallback = () => {
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
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
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: vi })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={loading}
            >
              <Check className="h-4 w-4 mr-1" />
              Chấp nhận
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
