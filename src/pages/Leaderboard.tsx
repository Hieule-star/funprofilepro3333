import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_camly: number;
}

type TimeFilter = "all" | "month" | "week";

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  useEffect(() => {
    fetchLeaderboard();
  }, [timeFilter]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      if (timeFilter === "all") {
        // Query from user_rewards for all-time leaderboard
        const { data, error } = await supabase
          .from("user_rewards")
          .select(`
            user_id,
            camly_balance,
            profiles:user_id (
              username,
              avatar_url
            )
          `)
          .order("camly_balance", { ascending: false })
          .limit(10);

        if (error) throw error;

        const formattedData = data?.map((entry: any) => ({
          user_id: entry.user_id,
          username: entry.profiles?.username || "Anonymous",
          avatar_url: entry.profiles?.avatar_url || null,
          total_camly: entry.camly_balance,
        })) || [];

        setLeaderboard(formattedData);
      } else {
        // Query from reward_transactions for time-filtered leaderboard
        const now = new Date();
        let startDate = new Date();

        if (timeFilter === "week") {
          startDate.setDate(now.getDate() - 7);
        } else if (timeFilter === "month") {
          startDate.setMonth(now.getMonth() - 1);
        }

        const { data, error } = await supabase
          .from("reward_transactions")
          .select(`
            user_id,
            amount,
            profiles:user_id (
              username,
              avatar_url
            )
          `)
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Group by user and sum amounts
        const userTotals = new Map<string, LeaderboardEntry>();
        
        data?.forEach((transaction: any) => {
          const userId = transaction.user_id;
          const existing = userTotals.get(userId);

          if (existing) {
            existing.total_camly += transaction.amount;
          } else {
            userTotals.set(userId, {
              user_id: userId,
              username: transaction.profiles?.username || "Anonymous",
              avatar_url: transaction.profiles?.avatar_url || null,
              total_camly: transaction.amount,
            });
          }
        });

        // Sort by total_camly and take top 10
        const sortedData = Array.from(userTotals.values())
          .sort((a, b) => b.total_camly - a.total_camly)
          .slice(0, 10);

        setLeaderboard(sortedData);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-8 w-8 text-yellow-500" />;
    if (index === 1) return <Medal className="h-7 w-7 text-gray-400" />;
    if (index === 2) return <Award className="h-6 w-6 text-amber-600" />;
    return null;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600">👑 #1</Badge>;
    if (index === 1) return <Badge className="bg-gradient-to-r from-gray-300 to-gray-500">🥈 #2</Badge>;
    if (index === 2) return <Badge className="bg-gradient-to-r from-amber-500 to-amber-700">🥉 #3</Badge>;
    return <Badge variant="outline">#{index + 1}</Badge>;
  };

  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case "week":
        return "7 ngày qua";
      case "month":
        return "30 ngày qua";
      default:
        return "Tổng thể";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="border-primary shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <TrendingUp className="h-10 w-10 text-primary" />
            <CardTitle className="text-4xl font-heading font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              BẢNG XẾP HẠNG
            </CardTitle>
          </div>
          
          <Tabs value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilter)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="month">Tháng này</TabsTrigger>
              <TabsTrigger value="week">Tuần này</TabsTrigger>
            </TabsList>
          </Tabs>

          <p className="text-center text-muted-foreground">
            {getTimeFilterLabel()} • Top 10 Users
          </p>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-muted-foreground">Đang tải...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chưa có dữ liệu xếp hạng</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`
                    flex items-center gap-4 p-4 rounded-xl transition-all
                    ${index < 3 
                      ? 'bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-2 border-primary/30 shadow-lg hover:shadow-xl' 
                      : 'bg-muted hover:bg-muted/80 border border-border'
                    }
                    animate-fade-in
                  `}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-center w-16">
                    {getRankIcon(index) || (
                      <span className="text-2xl font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                    )}
                  </div>

                  <Avatar className={`${index < 3 ? 'h-16 w-16 ring-4 ring-primary/30' : 'h-14 w-14'}`}>
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                      {entry.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`font-bold truncate ${index < 3 ? 'text-lg' : 'text-base'}`}>
                        {entry.username}
                      </p>
                      {getRankBadge(index)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.total_camly.toLocaleString("en-US")} CAMLY
                    </p>
                  </div>

                  <div className="text-right">
                    <p className={`font-bold ${index < 3 ? 'text-3xl text-primary' : 'text-2xl'}`}>
                      {entry.total_camly.toLocaleString("en-US")}
                    </p>
                    <p className="text-xs text-muted-foreground">coins</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-muted">
        <CardHeader>
          <CardTitle className="text-lg">💡 Cách kiếm CAMLY Coin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>🎉 <strong>Đăng ký:</strong> 50,000 CAMLY</p>
          <p>📝 <strong>Đăng bài:</strong> 10,000-15,000 CAMLY (có media được nhiều hơn)</p>
          <p>💬 <strong>Comment:</strong> 1,000 CAMLY</p>
          <p>❤️ <strong>Like:</strong> 500 CAMLY</p>
          <p>👥 <strong>Kết bạn:</strong> 2,000 CAMLY (cả 2 người)</p>
          <p>🎮 <strong>Chơi game:</strong> Điểm số x 100 CAMLY</p>
        </CardContent>
      </Card>
    </div>
  );
}
