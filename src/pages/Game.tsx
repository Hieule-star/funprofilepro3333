import { useState } from "react";
import FeaturedGame from "@/components/game/FeaturedGame";
import GameCard from "@/components/game/GameCard";
import Leaderboard from "@/components/game/Leaderboard";
import UserStats from "@/components/game/UserStats";
import GameModal from "@/components/game/GameModal";
import { Gamepad2, Trophy, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const games = [
  {
    id: "puzzle-slider",
    name: "Puzzle Slider",
    icon: "🧩",
    difficulty: 3,
    description: "Xếp hình 3x3 với hình ảnh đẹp mắt",
  },
  {
    id: "memory-cards",
    name: "Memory Cards",
    icon: "🃏",
    difficulty: 3,
    description: "Lật thẻ và ghép đôi các hình giống nhau",
  },
  {
    id: "tic-tac-toe",
    name: "Tic-Tac-Toe",
    icon: "🎯",
    difficulty: 1,
    description: "Cờ ca-rô cổ điển cho 2 người chơi",
  },
];

export default function Game() {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Gamepad2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Trung Tâm Giải Trí</h1>
        </div>

        <Tabs defaultValue="games" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="games" className="gap-2">
              <Gamepad2 className="h-4 w-4" />
              Game
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2">
              <Trophy className="h-4 w-4" />
              Xếp hạng
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Thành tích
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="space-y-6">
            <FeaturedGame game={games[0]} onPlay={() => setSelectedGame(games[0].id)} />

            <div>
              <h2 className="text-2xl font-bold mb-4">Tất cả các Game</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onPlay={() => setSelectedGame(game.id)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard />
          </TabsContent>

          <TabsContent value="stats">
            <UserStats />
          </TabsContent>
        </Tabs>
      </div>

      <GameModal
        gameId={selectedGame}
        onClose={() => setSelectedGame(null)}
      />
    </div>
  );
}
