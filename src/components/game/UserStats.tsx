import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Clock, Award } from "lucide-react";

export default function UserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalScore: 0,
    gamesPlayed: 0,
    achievements: 0,
    bestScore: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const { data: scores } = await supabase
        .from("game_scores")
        .select("score")
        .eq("user_id", user.id);

      const { data: achievements } = await supabase
        .from("user_achievements")
        .select("id")
        .eq("user_id", user.id);

      if (scores) {
        const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
        const bestScore = Math.max(...scores.map((s) => s.score), 0);

        setStats({
          totalScore,
          gamesPlayed: scores.length,
          achievements: achievements?.length || 0,
          bestScore,
        });
      }
    };

    fetchStats();
  }, [user]);

  const statCards = [
    {
      title: "Tổng điểm",
      value: stats.totalScore.toLocaleString(),
      icon: Trophy,
      color: "text-yellow-500",
    },
    {
      title: "Game đã chơi",
      value: stats.gamesPlayed,
      icon: Target,
      color: "text-blue-500",
    },
    {
      title: "Điểm cao nhất",
      value: stats.bestScore.toLocaleString(),
      icon: Clock,
      color: "text-green-500",
    },
    {
      title: "Thành tích",
      value: stats.achievements,
      icon: Award,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
