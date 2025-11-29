import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users, Search, Loader2, UserCheck, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import UserSearchCard from "@/components/friends/UserSearchCard";
import FriendRequestCard from "@/components/friends/FriendRequestCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import NewConversationModal from "@/components/chat/NewConversationModal";

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  user_profile?: UserProfile;
  friend_profile?: UserProfile;
}

export default function Friends() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendshipsMap, setFriendshipsMap] = useState<Map<string, string>>(new Map());
  const [selectedFriendForChat, setSelectedFriendForChat] = useState<string | null>(null);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);

  const fetchFriendRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("friendships")
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at
      `)
      .eq("friend_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching friend requests:", error);
      return;
    }

    // Fetch profiles for all friend requests
    if (data && data.length > 0) {
      const userIds = data.map(req => req.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      const requestsWithProfiles = data.map(req => ({
        ...req,
        user_profile: profiles?.find(p => p.id === req.user_id),
      }));

      setFriendRequests(requestsWithProfiles as any);
    } else {
      setFriendRequests([]);
    }
  };

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

    // Get friend IDs
    const friendIds = data?.map(f => 
      f.user_id === user.id ? f.friend_id : f.user_id
    ) || [];

    if (friendIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", friendIds);

      setFriends(profiles || []);
    } else {
      setFriends([]);
    }
  };

  const fetchAllFriendships = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    const map = new Map<string, string>();
    data?.forEach(f => {
      if (f.user_id === user.id) {
        map.set(f.friend_id, f.status === "pending" ? "pending_sent" : f.status);
      } else if (f.friend_id === user.id) {
        map.set(f.user_id, f.status === "pending" ? "pending_received" : f.status);
      }
    });
    setFriendshipsMap(map);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", `%${searchQuery}%`)
        .neq("id", user.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tìm kiếm người dùng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFriendRequests();
      fetchFriends();
      fetchAllFriendships();

      // Real-time subscription for friendships
      const channel = supabase
        .channel("friendships-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friendships",
          },
          () => {
            fetchFriendRequests();
            fetchFriends();
            fetchAllFriendships();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleRefresh = () => {
    fetchFriendRequests();
    fetchFriends();
    fetchAllFriendships();
  };

  const handleStartChat = (friendId: string) => {
    setSelectedFriendForChat(friendId);
    setShowNewConversationModal(true);
  };

  const handleConversationCreated = (conversationId: string) => {
    navigate("/chat");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Users className="h-6 w-6 text-primary" />
                Bạn bè
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="search">Tìm kiếm</TabsTrigger>
              <TabsTrigger value="requests" className="relative">
                Lời mời
                {friendRequests.length > 0 && (
                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                    {friendRequests.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="friends">Danh sách ({friends.length})</TabsTrigger>
            </TabsList>

            {/* Search Tab */}
            <TabsContent value="search" className="space-y-4 mt-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tìm kiếm theo tên..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <UserSearchCard
                      key={user.id}
                      userId={user.id}
                      username={user.username || "Người dùng"}
                      avatarUrl={user.avatar_url}
                      bio={user.bio}
                      friendshipStatus={friendshipsMap.get(user.id) as any}
                      onStatusChange={handleRefresh}
                    />
                  ))
                ) : searchQuery && !loading ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">Không tìm thấy người dùng</p>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </TabsContent>

            {/* Friend Requests Tab */}
            <TabsContent value="requests" className="space-y-3 mt-6">
              {friendRequests.length > 0 ? (
                friendRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    requestId={request.id}
                    userId={request.user_id}
                    username={request.user_profile?.username || "Người dùng"}
                    avatarUrl={request.user_profile?.avatar_url || null}
                    bio={request.user_profile?.bio || null}
                    createdAt={request.created_at}
                    onUpdate={handleRefresh}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Không có lời mời kết bạn</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Friends List Tab */}
            <TabsContent value="friends" className="space-y-3 mt-6">
              {friends.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {friends.map((friend) => (
                    <Card key={friend.id}>
                      <CardContent className="flex items-center gap-3 p-4">
                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                          {friend.avatar_url && <AvatarImage src={friend.avatar_url} />}
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {friend.username?.substring(0, 2).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{friend.username || "Người dùng"}</p>
                          {friend.bio && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {friend.bio}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleStartChat(friend.id)}
                          className="gap-2"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Nhắn tin
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Chưa có bạn bè</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Hãy tìm kiếm và kết bạn với người khác
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <NewConversationModal
        open={showNewConversationModal}
        onOpenChange={setShowNewConversationModal}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}
