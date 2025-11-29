import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, MessageSquare, Heart, Users, Award, Settings, Loader2 } from "lucide-react";
import Post from "@/components/Post";
import EditProfileModal from "@/components/EditProfileModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface PostData {
  id: string;
  content: string;
  created_at: string;
  media_url: string | null;
  media_type: string | null;
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

export default function Profile() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [stats, setStats] = useState<StatsData>({
    postsCount: 0,
    friendsCount: 0,
    likesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(`
          id,
          content,
          created_at,
          media_url,
          media_type,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

      // Calculate stats
      const postsCount = postsData?.length || 0;

      // Count friends (accepted friendships)
      const { count: friendsCount } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      // Count likes on user's posts
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
      console.error("Error fetching user data:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const getAvatarFallback = () => {
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const statsData = [
    { icon: TrendingUp, label: "Bài viết", value: stats.postsCount, color: "text-primary" },
    { icon: Users, label: "Bạn bè", value: stats.friendsCount, color: "text-info" },
    { icon: Heart, label: "Lượt thích", value: stats.likesCount, color: "text-destructive" },
    { icon: Award, label: "Phần thưởng", value: 0, color: "text-warning" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">Vui lòng đăng nhập để xem profile</p>
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
                <Button 
                  className="gap-2"
                  onClick={() => setEditModalOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                  Chỉnh sửa
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {statsData.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="border-primary/20">
                  <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                    <p className="mt-2 text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

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
                    author={post.profiles.username || "Người dùng"}
                    avatar={post.profiles.username?.substring(0, 2).toUpperCase() || "U"}
                    content={post.content || ""}
                    timestamp={new Date(post.created_at)}
                    likes={0}
                    comments={0}
                    shares={0}
                    media={post.media_url && post.media_type ? [{
                      type: post.media_type as "image" | "video",
                      url: post.media_url
                    }] : undefined}
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
              {posts.filter(p => p.media_url).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {posts
                    .filter(p => p.media_url)
                    .map((post, index) => (
                      <div key={index} className="relative overflow-hidden rounded-lg bg-muted aspect-square">
                        {post.media_type === "video" ? (
                          <video
                            src={post.media_url!}
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : (
                          <img
                            src={post.media_url!}
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
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Chưa có hoạt động nào</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <EditProfileModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        currentUsername={profile.username || ""}
        currentBio={profile.bio || ""}
        currentAvatarUrl={profile.avatar_url || ""}
        onProfileUpdate={fetchUserData}
      />
    </div>
  );
}
