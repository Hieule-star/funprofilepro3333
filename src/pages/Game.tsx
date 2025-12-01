import { useState } from "react";
import FeaturedGame from "@/components/game/FeaturedGame";
import GameCard from "@/components/game/GameCard";
import Leaderboard from "@/components/game/Leaderboard";
import UserStats from "@/components/game/UserStats";
import GameModal from "@/components/game/GameModal";
import { Gamepad2, Trophy, BarChart3, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const kidsGames = [
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
  {
    id: "color-match",
    name: "Color Match",
    icon: "🎨",
    difficulty: 1,
    description: "Ghép các ô màu giống nhau",
  },
  {
    id: "math-kids",
    name: "Math Kids",
    icon: "🔢",
    difficulty: 2,
    description: "Giải toán cộng trừ vui nhộn",
  },
  {
    id: "word-scramble",
    name: "Word Scramble",
    icon: "📝",
    difficulty: 2,
    description: "Xếp chữ cái thành từ có nghĩa",
  },
  {
    id: "catch-stars",
    name: "Catch Stars",
    icon: "⭐",
    difficulty: 1,
    description: "Bắt sao rơi để ghi điểm cao",
  },
  {
    id: "animal-quiz",
    name: "Animal Quiz",
    icon: "🦁",
    difficulty: 1,
    description: "Đoán tên các con vật dễ thương",
  },
];

const teenGames = [
  {
    id: "speed-typing",
    name: "Speed Typing",
    icon: "⌨️",
    difficulty: 4,
    description: "Thử thách gõ phím nhanh và chính xác",
  },
  {
    id: "game-2048",
    name: "2048",
    icon: "🔲",
    difficulty: 4,
    description: "Ghép số tạo 2048 huyền thoại",
  },
  {
    id: "snake-game",
    name: "Snake Game",
    icon: "🐍",
    difficulty: 3,
    description: "Rắn săn mồi cổ điển, càng ăn càng dài",
  },
  {
    id: "quiz-master",
    name: "Quiz Master",
    icon: "🧠",
    difficulty: 4,
    description: "Đố vui kiến thức tổng hợp",
  },
  {
    id: "reaction-test",
    name: "Reaction Test",
    icon: "⚡",
    difficulty: 3,
    description: "Kiểm tra tốc độ phản xạ của bạn",
  },
  {
    id: "simon-says",
    name: "Simon Says",
    icon: "🎵",
    difficulty: 4,
    description: "Nhớ chuỗi màu sắc ngày càng dài",
  },
];

const seniorGames = [
  {
    id: "sudoku",
    name: "Sudoku",
    icon: "🔢",
    difficulty: 3,
    description: "Điền số 1-9 vào ô trống, rèn luyện tư duy",
  },
  {
    id: "spot-difference",
    name: "Tìm Điểm Khác",
    icon: "🔍",
    difficulty: 2,
    description: "So sánh 2 hình và tìm điểm khác biệt",
  },
  {
    id: "jigsaw-puzzle",
    name: "Ghép Hình",
    icon: "🧩",
    difficulty: 2,
    description: "Sắp xếp các mảnh ghép về đúng vị trí",
  },
  {
    id: "proverb-quiz",
    name: "Đoán Thành Ngữ",
    icon: "📜",
    difficulty: 2,
    description: "Hoàn thành câu thành ngữ Việt Nam",
  },
  {
    id: "gomoku",
    name: "Cờ Caro",
    icon: "⭕",
    difficulty: 3,
    description: "Xếp 5 quân liên tiếp để thắng máy",
  },
  {
    id: "number-sort",
    name: "Sắp Xếp Số",
    icon: "🔢",
    difficulty: 2,
    description: "Di chuyển ô để sắp xếp số theo thứ tự",
  },
];

const multiplayerGames = [
  {
    id: "multiplayer-gomoku",
    name: "Cờ Caro Online",
    icon: "⭕",
    difficulty: 3,
    description: "Đấu Cờ Caro với bạn bè hoặc người chơi khác",
    isMultiplayer: true,
  },
  {
    id: "multiplayer-tictactoe",
    name: "Tic-Tac-Toe Online",
    icon: "🎯",
    difficulty: 1,
    description: "Cờ ca-rô 3x3 đối kháng trực tuyến",
    isMultiplayer: true,
  },
  {
    id: "multiplayer-memory",
    name: "Memory Đua Điểm",
    icon: "🃏",
    difficulty: 2,
    description: "Thi đấu lật thẻ ghép đôi với đối thủ",
    isMultiplayer: true,
  },
];

const allGames = [...kidsGames, ...teenGames, ...seniorGames, ...multiplayerGames];

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
            <FeaturedGame game={allGames[0]} onPlay={() => setSelectedGame(allGames[0].id)} />

            {/* Multiplayer Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-2xl font-bold">🌐 Chơi Online</h2>
                <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                  <Users className="w-3 h-3 mr-1" />
                  Multiplayer
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {multiplayerGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onPlay={() => setSelectedGame(game.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">🧒 Dành cho Thiếu Nhi</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kidsGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onPlay={() => setSelectedGame(game.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">👦 Dành cho Thanh Thiếu Niên</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teenGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onPlay={() => setSelectedGame(game.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">👴 Dành cho Người Lớn Tuổi</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {seniorGames.map((game) => (
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
