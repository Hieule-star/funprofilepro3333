import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Award, Loader2, UserPlus, UserCheck, MessageCircle, Clock, FileText, MessageSquare, Heart, Users, Gamepad2, Calendar } from "lucide-react";
import Post from "@/components/Post";
import HonorBoard from "@/components/HonorBoard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useParams, useNavigate } from "react-router-dom";

interface MediaItem {
  type: "image" | "video";
  url: string;
}

interface PostData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  media: MediaItem[] | null;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

interface StatsData {
  postsCount: number;
  friendsCount: number;
  likesCount: number;
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

interface RewardTransaction {
  id: string;
  reward_type: string;
  description: string | null;
  amount: number;
  created_at: string;
}

type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "accepted";

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [stats, setStats] = useState<StatsData>({
    postsCount: 0,
    friendsCount: 0,
    likesCount: 0,
  });
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>("none");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rewardTransactions, setRewardTransactions] = useState<RewardTransaction[]>([]);

  useEffect(() => {
    // Redirect to own profile if viewing own user ID
    if (userId === user?.id) {
      navigate("/profile");
      return;
    }
    
    if (userId) {
      fetchUserProfile();
      fetchFriendshipStatus();
      fetchRewardTransactions();
    }
  }, [userId, user]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          id,
          content,
          created_at,
          user_id,
          media,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      setPosts((postsData as any) || []);

      // Calculate stats
      const postsCount = postsData?.length || 0;

      // Count friends
      const { count: friendsCount } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      // Count likes
      const postIds = postsData?.map(p => p.id) || [];
      let likesCount = 0;
      if (postIds.length > 0) {
        const { count } = await supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true })
          .in("post_id", postIds);
        likesCount = count || 0;
      }

      setStats({
        postsCount,
        friendsCount: friendsCount || 0,
        likesCount,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải profile người dùng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendshipStatus = async () => {
    if (!userId || !user) return;

    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id.eq.${user.id},friend_id.eq.${userId}`)
      .or(`user_id.eq.${userId},friend_id.eq.${user.id}`)
      .single();

    if (data) {
      if (data.status === "accepted") {
        setFriendshipStatus("accepted");
      } else if (data.status === "pending") {
        if (data.user_id === user.id) {
          setFriendshipStatus("pending_sent");
        } else {
          setFriendshipStatus("pending_received");
        }
      }
    } else {
      setFriendshipStatus("none");
    }
  };

  const fetchRewardTransactions = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("reward_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setRewardTransactions(data || []);
    } catch (error) {
      console.error("Error fetching reward transactions:", error);
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "registration":
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      case "post":
        return <FileText className="h-5 w-5 text-green-500" />;
      case "comment":
        return <MessageSquare className="h-5 w-5 text-cyan-500" />;
      case "like":
        return <Heart className="h-5 w-5 text-red-500" />;
      case "friend":
        return <Users className="h-5 w-5 text-purple-500" />;
      case "game":
        return <Gamepad2 className="h-5 w-5 text-orange-500" />;
      case "daily_checkin":
        return <Calendar className="h-5 w-5 text-yellow-500" />;
      default:
        return <Award className="h-5 w-5 text-primary" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSendFriendRequest = async () => {
    if (!userId || !user) return;

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from("friendships")
        .insert({
          user_id: user.id,
          friend_id: userId,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Đã gửi lời mời",
        description: "Lời mời kết bạn đã được gửi",
      });
      setFriendshipStatus("pending_sent");
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast({
        title: "Lỗi",
        description: "Không thể gửi lời mời kết bạn",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!userId || !user) return;

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("user_id", userId)
        .eq("friend_id", user.id);

      if (error) throw error;

      toast({
        title: "Đã chấp nhận",
        description: "Bạn đã trở thành bạn bè",
      });
      setFriendshipStatus("accepted");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast({
        title: "Lỗi",
        description: "Không thể chấp nhận lời mời",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!userId || !user) return;

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from("friendships")
        .delete()
        .or(`user_id.eq.${user.id},friend_id.eq.${userId}`)
        .or(`user_id.eq.${userId},friend_id.eq.${user.id}`);

      if (error) throw error;

      toast({
        title: "Đã hủy",
        description: "Đã hủy lời mời kết bạn",
      });
      setFriendshipStatus("none");
    } catch (error) {
      console.error("Error canceling friend request:", error);
      toast({
        title: "Lỗi",
        description: "Không thể hủy lời mời",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!userId || !user) return;

    try {
      // Check if conversation already exists
      const { data: existingConversations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (existingConversations && existingConversations.length > 0) {
        const conversationIds = existingConversations.map(c => c.conversation_id);
        
        const { data: targetParticipants } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", userId)
          .in("conversation_id", conversationIds);

        if (targetParticipants && targetParticipants.length > 0) {
          // Conversation exists, navigate to chat
          navigate("/chat");
          return;
        }
      }

      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from("conversations")
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      // Add both participants
      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: newConversation.id, user_id: user.id },
          { conversation_id: newConversation.id, user_id: userId },
        ]);

      if (participantsError) throw participantsError;

      toast({
        title: "Thành công",
        description: "Đã tạo cuộc trò chuyện mới",
      });
      navigate("/chat");
    } catch (error) {
      console.error("Error starting chat:", error);
      toast({
        title: "Lỗi",
        description: "Không thể bắt đầu trò chuyện",
        variant: "destructive",
      });
    }
  };

  const renderActionButton = () => {
    switch (friendshipStatus) {
      case "none":
        return (
          <Button
            className="gap-2"
            onClick={handleSendFriendRequest}
            disabled={actionLoading}
          >
            <UserPlus className="h-4 w-4" />
            Kết bạn
          </Button>
        );
      case "pending_sent":
        return (
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleCancelFriendRequest}
            disabled={actionLoading}
          >
            <Clock className="h-4 w-4" />
            Đã gửi
          </Button>
        );
      case "pending_received":
        return (
          <div className="flex gap-2">
            <Button
              className="gap-2"
              onClick={handleAcceptFriendRequest}
              disabled={actionLoading}
            >
              <UserCheck className="h-4 w-4" />
              Chấp nhận
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelFriendRequest}
              disabled={actionLoading}
            >
              Từ chối
            </Button>
          </div>
        );
      case "accepted":
        return (
          <Button
            className="gap-2"
            onClick={handleStartChat}
          >
            <MessageCircle className="h-4 w-4" />
            Nhắn tin
          </Button>
        );
    }
  };

  const getAvatarFallback = () => {
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">Không tìm thấy người dùng</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Profile Header */}
          <Card className="border-primary/20">
            <div className="h-32 w-full rounded-t-lg bg-gradient-hero"></div>
            <CardContent className="relative pt-16">
              <Avatar className="absolute -top-16 left-6 h-32 w-32 border-4 border-card">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="bg-primary/10 text-primary text-4xl font-bold">
                  {getAvatarFallback()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <h1 className="text-2xl font-heading font-bold">
                    {profile.username || "Người dùng"}
                  </h1>
                  <p className="text-muted-foreground">@{profile.username || "username"}</p>
                  {profile.bio && (
                    <p className="max-w-md text-sm">
                      {profile.bio}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Award className="h-3 w-3" />
                      Thành viên
                    </Badge>
                    {stats.postsCount > 10 && (
                      <Badge variant="secondary" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Hoạt động tích cực
                      </Badge>
                    )}
                  </div>
                </div>
                {renderActionButton()}
              </div>
            </CardContent>
          </Card>

          {/* Stats - Honor Board */}
          <HonorBoard userId={userId} />

          {/* Content Tabs */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="posts">Bài viết</TabsTrigger>
              <TabsTrigger value="media">Ảnh & Video</TabsTrigger>
              <TabsTrigger value="activity">Hoạt động</TabsTrigger>
            </TabsList>
            <TabsContent value="posts" className="mt-6 space-y-4">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <Post
                    key={post.id}
                    postId={post.id}
                    userId={post.user_id}
                    author={post.profiles.username || "Người dùng"}
                    avatar={post.profiles.username?.substring(0, 2).toUpperCase() || "U"}
                    content={post.content || ""}
                    timestamp={new Date(post.created_at)}
                    likes={0}
                    comments={0}
                    shares={0}
                    media={post.media || undefined}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Chưa có bài viết nào</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="media" className="mt-6">
              {posts.filter(p => p.media && p.media.length > 0).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {posts
                    .filter(p => p.media && p.media.length > 0)
                    .flatMap(post => post.media || [])
                    .map((mediaItem, index) => (
                      <div key={index} className="relative overflow-hidden rounded-lg bg-muted aspect-square">
                        {mediaItem.type === "video" ? (
                          <video
                            src={mediaItem.url}
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : (
                          <img
                            src={mediaItem.url}
                            alt={`Media ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Chưa có ảnh hoặc video nào</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="activity" className="mt-6">
              {rewardTransactions.length > 0 ? (
                <div className="space-y-3">
                  {rewardTransactions.map((tx) => (
                    <Card key={tx.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getRewardIcon(tx.reward_type)}
                          <div className="flex-1">
                            <p className="font-medium">{tx.description || "Hoạt động"}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(tx.created_at)}
                            </p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-primary whitespace-nowrap ml-4">
                          +{tx.amount.toLocaleString("en-US")} CAMLY
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Chưa có hoạt động nào</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
