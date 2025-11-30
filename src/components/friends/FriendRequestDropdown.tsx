import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FriendRequest {
  id: string;
  user_id: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

export default function FriendRequestDropdown() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const fetchRequests = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("friendships")
      .select(`
        id,
        user_id,
        created_at
      `)
      .eq("friend_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching friend requests:", error);
      setLoading(false);
      return;
    }

    // Fetch profiles
    if (data && data.length > 0) {
      const userIds = data.map(req => req.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const requestsWithProfiles = data.map(req => ({
        ...req,
        profiles: profiles?.find(p => p.id === req.user_id),
      }));

      setRequests(requestsWithProfiles as any);
    } else {
      setRequests([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;

    if (open) {
      fetchRequests();
    }

    // Real-time subscription
    const channel = supabase
      .channel("friend-requests-dropdown")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `friend_id=eq.${user.id}`,
        },
        () => {
          if (open) {
            fetchRequests();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, open]);

  const handleAccept = async (requestId: string, username: string) => {
    try {
      setActionLoading(requestId);
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Đã chấp nhận",
        description: `Bạn và ${username} đã là bạn bè`,
      });
      
      fetchRequests();
    } catch (error) {
      console.error("Error accepting request:", error);
      toast({
        title: "Lỗi",
        description: "Không thể chấp nhận lời mời",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Đã từ chối",
        description: "Đã từ chối lời mời kết bạn",
      });
      
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Lỗi",
        description: "Không thể từ chối lời mời",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getAvatarFallback = (username?: string) => {
    return username?.substring(0, 2).toUpperCase() || "U";
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Users className="h-5 w-5" />
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground font-semibold">
              {requests.length > 9 ? "9+" : requests.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Lời mời kết bạn</span>
          {requests.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              {requests.length} lời mời
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Không có lời mời kết bạn mới
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            {requests.map((request) => (
              <div key={request.id} className="p-3 hover:bg-accent transition-colors">
                <div className="flex items-start gap-3">
                  <Avatar 
                    className="h-10 w-10 border-2 border-primary/20 cursor-pointer"
                    onClick={() => {
                      setOpen(false);
                      navigate(`/user/${request.user_id}`);
                    }}
                  >
                    {request.profiles?.avatar_url && (
                      <AvatarImage src={request.profiles.avatar_url} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getAvatarFallback(request.profiles?.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p 
                      className="font-semibold text-sm cursor-pointer hover:underline"
                      onClick={() => {
                        setOpen(false);
                        navigate(`/user/${request.user_id}`);
                      }}
                    >
                      {request.profiles?.username || "Người dùng"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(request.created_at), {
                        addSuffix: true,
                        locale: vi,
                      })}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => handleAccept(request.id, request.profiles?.username || "Người dùng")}
                        disabled={actionLoading === request.id}
                      >
                        {actionLoading === request.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Chấp nhận
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleReject(request.id)}
                        disabled={actionLoading === request.id}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        )}
        
        {requests.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer justify-center text-primary font-medium"
              onClick={() => {
                setOpen(false);
                navigate("/friends");
              }}
            >
              Xem tất cả
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
