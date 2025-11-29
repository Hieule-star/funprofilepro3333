import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState("all");

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedGame]);

  const fetchLeaderboard = async () => {
    let query = supabase
      .from("game_scores")
      .select(`
        score,
        game_type,
        profiles (username, avatar_url)
      `)
      .order("score", { ascending: false })
      .limit(10);

    if (selectedGame !== "all") {
      query = query.eq("game_type", selectedGame);
    }

    const { data, error } = await query;

    if (!error && data) {
      setLeaderboardData(data);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Bảng Xếp Hạng
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedGame} onValueChange={setSelectedGame}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="puzzle-slider">Puzzle</TabsTrigger>
            <TabsTrigger value="memory-cards">Memory</TabsTrigger>
            <TabsTrigger value="tic-tac-toe">Tic-Tac</TabsTrigger>
          </TabsList>

          <div className="space-y-4">
            {leaderboardData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Chưa có dữ liệu xếp hạng
              </p>
            ) : (
              leaderboardData.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="text-2xl font-bold w-8 text-center">
                    {getRankIcon(index) || `#${index + 1}`}
                  </div>

                  <Avatar className="h-10 w-10">
                    <AvatarImage src={entry.profiles?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {entry.profiles?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <p className="font-semibold">{entry.profiles?.username || "Anonymous"}</p>
                    <p className="text-sm text-muted-foreground">{entry.game_type}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{entry.score}</p>
                    <p className="text-xs text-muted-foreground">điểm</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
