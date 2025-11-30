import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Heart, Users, TrendingUp, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.jpg";

interface Stats {
  posts: number;
  comments: number;
  reactions: number;
  friends: number;
  camlyBalance: number;
}

interface HonorBoardProps {
  userId?: string;
}

export default function HonorBoard({ userId }: HonorBoardProps = {}) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const [stats, setStats] = useState<Stats>({
    posts: 0,
    comments: 0,
    reactions: 0,
    friends: 0,
    camlyBalance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetUserId) return;

    const fetchStats = async () => {
      try {
        // Fetch posts count
        const { count: postsCount } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", targetUserId);

        // Fetch comments count
        const { count: commentsCount } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("user_id", targetUserId);

        // Fetch likes count
        const { count: likesCount } = await supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", targetUserId);

        // Fetch friends count
        const { count: friendsCount } = await supabase
          .from("friendships")
          .select("*", { count: "exact", head: true })
          .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`)
          .eq("status", "accepted");

        // Fetch CAMLY balance
        const { data: rewardsData } = await supabase
          .from("user_rewards")
          .select("camly_balance")
          .eq("user_id", targetUserId)
          .maybeSingle();

        setStats({
          posts: postsCount || 0,
          comments: commentsCount || 0,
          reactions: likesCount || 0,
          friends: friendsCount || 0,
          camlyBalance: rewardsData?.camly_balance || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Subscribe to realtime updates for user_rewards
    const channel = supabase
      .channel("user-rewards-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_rewards",
          filter: `user_id=eq.${targetUserId}`,
        },
        (payload) => {
          if (payload.new && "camly_balance" in payload.new) {
            setStats((prev) => ({
              ...prev,
              camlyBalance: (payload.new as any).camly_balance,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId]);

  const statItems = [
    { icon: TrendingUp, label: "POSTS", value: stats.posts, color: "text-primary" },
    { icon: MessageSquare, label: "COMMENTS", value: stats.comments, color: "text-info" },
    { icon: Heart, label: "REACTIONS", value: stats.reactions, color: "text-destructive" },
    { icon: Users, label: "FRIENDS", value: stats.friends, color: "text-secondary" },
    { 
      icon: Award, 
      label: "CAMLY COIN", 
      value: stats.camlyBalance.toLocaleString("en-US"),
      color: "text-warning" 
    },
  ];

  return (
    <Card className="border-primary bg-gradient-to-br from-primary via-primary-light to-secondary shadow-glow">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-center gap-3">
          <img src={logo} alt="Fun Profile Web3" className="h-16 w-16 rounded-full object-cover border-4 border-primary-foreground shadow-lg" />
        </div>
        <CardTitle className="text-center text-2xl font-heading font-bold text-primary-foreground">
          HONOR BOARD
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-primary-foreground/70">
            Đang tải...
          </div>
        ) : (
          statItems.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border-2 border-primary-foreground/20 bg-primary-foreground/10 px-4 py-3 backdrop-blur-sm transition-all hover:border-primary-foreground/40 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                  <span className="font-semibold text-primary-foreground">
                    {stat.label}
                  </span>
                </div>
                <span className="text-xl font-bold text-primary-foreground">
                  {stat.value}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
