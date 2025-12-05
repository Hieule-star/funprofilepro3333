import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Award, 
  Loader2, 
  FileText, 
  MessageSquare, 
  Heart, 
  Users, 
  Gamepad2, 
  Calendar,
  UserPlus,
  Activity,
  LayoutGrid,
  Coins
} from "lucide-react";
import Post from "@/components/Post";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ReputationBar } from "@/components/profile/ReputationBar";
import { BadgesSection } from "@/components/profile/BadgesSection";
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
  camlyBalance: number;
}

interface UserProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  cover_url?: string;
  job_title?: string;
  location?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_tiktok?: string;
  social_twitter?: string;
  social_website?: string;
  badges?: any[];
  reputation_score?: number;
}

interface ActivityItem {
  id: string;
  reward_type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [stats, setStats] = useState<StatsData>({
    postsCount: 0,
    friendsCount: 0,
    likesCount: 0,
    camlyBalance: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect to own profile if viewing own user ID
    if (userId === user?.id) {
      navigate("/profile");
      return;
    }
    
    if (userId) {
      fetchUserProfile();
    }
  }, [userId, user]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch full profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData as UserProfileData);

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

      // Fetch CAMLY balance
      const { data: rewardsData } = await supabase
        .from("user_rewards")
        .select("camly_balance")
        .eq("user_id", userId)
        .single();

      setStats({
        postsCount,
        friendsCount: friendsCount || 0,
        likesCount,
        camlyBalance: rewardsData?.camly_balance || 0,
      });

      // Fetch recent activities
      const { data: activityData } = await supabase
        .from("reward_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      setActivities((activityData as ActivityItem[]) || []);

      // Fetch achievements
      const { data: achievementsData } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", userId);

      setAchievements(achievementsData || []);

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

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      registration: UserPlus,
      post: FileText,
      comment: MessageSquare,
      like: Heart,
      friend: Users,
      game: Gamepad2,
      daily_checkin: Calendar,
    };
    return icons[type] || Activity;
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
          {/* Profile Header - using new component */}
          <ProfileHeader
            profile={profile}
            isOwnProfile={false}
            postsCount={stats.postsCount}
            friendsCount={stats.friendsCount}
            onEditClick={() => {}}
            onCoverEditClick={() => {}}
          />

          {/* Reputation Bar */}
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <ReputationBar score={profile.reputation_score || 0} />
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: TrendingUp, label: "Bài viết", value: stats.postsCount, color: "text-primary" },
              { icon: Users, label: "Bạn bè", value: stats.friendsCount, color: "text-blue-500" },
              { icon: Heart, label: "Lượt thích", value: stats.likesCount, color: "text-red-500" },
              { icon: Coins, label: "CAMLY Coin", value: stats.camlyBalance.toLocaleString(), color: "text-yellow-500" },
            ].map((stat, index) => {
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
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Tổng quan</span>
              </TabsTrigger>
              <TabsTrigger value="posts" className="gap-1 text-xs sm:text-sm">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Bài viết</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1 text-xs sm:text-sm">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Hoạt động</span>
              </TabsTrigger>
              <TabsTrigger value="badges" className="gap-1 text-xs sm:text-sm">
                <Award className="h-4 w-4" />
                <span className="hidden sm:inline">Huy hiệu</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Activity */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Hoạt động gần đây
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activities.length > 0 ? (
                      <div className="space-y-3">
                        {activities.slice(0, 5).map((activity) => {
                          const Icon = getActivityIcon(activity.reward_type);
                          return (
                            <div key={activity.id} className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-primary/10">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{activity.description || "Hoạt động"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(activity.created_at).toLocaleDateString("vi-VN")}
                                </p>
                              </div>
                              <p className="text-sm font-medium text-primary">
                                +{activity.amount.toLocaleString()}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">Chưa có hoạt động</p>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Posts */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Bài viết mới nhất
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {posts.length > 0 ? (
                      <div className="space-y-3">
                        {posts.slice(0, 3).map((post) => (
                          <div key={post.id} className="p-3 rounded-lg bg-muted/50">
                            <p className="text-sm line-clamp-2">{post.content || "Đã đăng ảnh/video"}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(post.created_at).toLocaleDateString("vi-VN")}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">Chưa có bài viết</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Posts Tab */}
            <TabsContent value="posts" className="mt-6 space-y-4">
              {posts.length > 0 ? (
                <>
                  {/* Media Grid */}
                  {posts.filter(p => p.media && p.media.length > 0).length > 0 && (
                    <Card className="border-primary/20">
                      <CardHeader>
                        <CardTitle>Ảnh & Video</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                          {posts
                            .filter(p => p.media && p.media.length > 0)
                            .flatMap(post => post.media || [])
                            .slice(0, 12)
                            .map((mediaItem, index) => (
                              <div key={index} className="relative overflow-hidden rounded-lg bg-muted aspect-square">
                                {mediaItem.type === "video" ? (
                                  <video
                                    src={mediaItem.url}
                                    className="w-full h-full object-cover"
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
                      </CardContent>
                    </Card>
                  )}

                  {/* Posts List */}
                  {posts.map((post) => (
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
                  ))}
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Chưa có bài viết nào</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-6">
              {activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity) => {
                    const Icon = getActivityIcon(activity.reward_type);
                    return (
                      <Card key={activity.id} className="border-primary/20 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-primary/10">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{activity.description || "Hoạt động"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(activity.created_at).toLocaleDateString("vi-VN", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                            <span className="text-lg font-bold text-primary whitespace-nowrap ml-4">
                              +{activity.amount.toLocaleString()} CAMLY
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Activity className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Chưa có hoạt động nào</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Badges Tab */}
            <TabsContent value="badges" className="mt-6">
              <BadgesSection badges={profile.badges || []} achievements={achievements} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
