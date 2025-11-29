import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { Shuffle } from "lucide-react";

interface PuzzleSliderProps {
  onClose: () => void;
}

export default function PuzzleSlider({ onClose }: PuzzleSliderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const numbers = Array.from({ length: 8 }, (_, i) => i + 1);
    numbers.push(0); // 0 represents empty tile
    shuffleTiles(numbers);
  };

  const shuffleTiles = (arr: number[]) => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    setTiles(shuffled);
    setMoves(0);
    setIsWon(false);
  };

  const handleTileClick = (index: number) => {
    if (isWon) return;

    const emptyIndex = tiles.indexOf(0);
    const isAdjacent =
      (index === emptyIndex - 1 && emptyIndex % 3 !== 0) ||
      (index === emptyIndex + 1 && index % 3 !== 0) ||
      index === emptyIndex - 3 ||
      index === emptyIndex + 3;

    if (isAdjacent) {
      const newTiles = [...tiles];
      [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
      setTiles(newTiles);
      setMoves(moves + 1);

      if (checkWin(newTiles)) {
        setIsWon(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        saveScore();
      }
    }
  };

  const checkWin = (tilesArr: number[]) => {
    return tilesArr.every((tile, index) => tile === (index + 1) % 9);
  };

  const saveScore = async () => {
    if (!user) return;

    const score = Math.max(1000 - moves * 10, 100);
    const { error } = await supabase.from("game_scores").insert({
      user_id: user.id,
      game_type: "puzzle-slider",
      score,
    });

    if (!error) {
      toast({
        title: "Chúc mừng! 🎉",
        description: `Bạn đã hoàn thành với ${moves} bước và được ${score} điểm!`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-lg">
          Số bước: <span className="font-bold text-primary">{moves}</span>
        </div>
        <Button onClick={() => initializeGame()} variant="outline" size="sm" className="gap-2">
          <Shuffle className="h-4 w-4" />
          Chơi lại
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 aspect-square max-w-md mx-auto">
        {tiles.map((tile, index) => (
          <button
            key={index}
            onClick={() => handleTileClick(index)}
            disabled={tile === 0 || isWon}
            className={`
              aspect-square rounded-lg text-2xl font-bold transition-all
              ${
                tile === 0
                  ? "bg-transparent"
                  : "bg-primary text-primary-foreground hover:scale-105 active:scale-95"
              }
              ${isWon && "animate-pulse"}
            `}
          >
            {tile !== 0 && tile}
          </button>
        ))}
      </div>

      {isWon && (
        <div className="text-center">
          <p className="text-lg font-bold text-primary mb-4">
            Hoàn thành trong {moves} bước! 🎉
          </p>
          <Button onClick={onClose}>Đóng</Button>
        </div>
      )}
    </div>
  );
}
