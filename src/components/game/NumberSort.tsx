import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGameSounds } from "@/hooks/useGameSounds";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

interface NumberSortProps {
  onClose: () => void;
}

type Grid = (number | null)[];

export default function NumberSort({ onClose }: NumberSortProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  const [grid, setGrid] = useState<Grid>([]);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gridSize, setGridSize] = useState(3);

  const initGame = (size: number) => {
    const total = size * size;
    const numbers: Grid = [...Array(total - 1).keys()].map(i => i + 1);
    numbers.push(null);
    
    // Shuffle with solvability check
    let shuffled: Grid;
    do {
      shuffled = [...numbers].sort(() => Math.random() - 0.5);
    } while (!isSolvable(shuffled, size));

    setGrid(shuffled);
    setMoves(0);
    setIsComplete(false);
    setGridSize(size);
    setGameStarted(true);
  };

  const isSolvable = (puzzle: Grid, size: number): boolean => {
    let inversions = 0;
    const filtered = puzzle.filter(n => n !== null) as number[];
    
    for (let i = 0; i < filtered.length; i++) {
      for (let j = i + 1; j < filtered.length; j++) {
        if (filtered[i] > filtered[j]) inversions++;
      }
    }

    if (size % 2 === 1) {
      return inversions % 2 === 0;
    } else {
      const emptyRow = Math.floor(puzzle.indexOf(null) / size);
      return (inversions + emptyRow) % 2 === 1;
    }
  };

  const handleTileClick = (index: number) => {
    if (isComplete || grid[index] === null) return;

    const emptyIndex = grid.indexOf(null);
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const emptyRow = Math.floor(emptyIndex / gridSize);
    const emptyCol = emptyIndex % gridSize;

    // Check if adjacent to empty
    const isAdjacent =
      (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 && row === emptyRow);

    if (isAdjacent) {
      const newGrid = [...grid];
      newGrid[emptyIndex] = grid[index];
      newGrid[index] = null;
      setGrid(newGrid);
      setMoves(m => m + 1);
      playCorrect();

      // Check completion
      const isWin = newGrid.every((val, i) => {
        if (i === gridSize * gridSize - 1) return val === null;
        return val === i + 1;
      });

      if (isWin) {
        setIsComplete(true);
        playCelebration();
        confetti({ particleCount: 150, spread: 80 });
      }
    }
  };

  const getScore = () => {
    const baseScore = gridSize === 3 ? 500 : gridSize === 4 ? 1000 : 1500;
    const optimalMoves = gridSize === 3 ? 30 : gridSize === 4 ? 80 : 150;
    const penalty = Math.max(0, moves - optimalMoves) * 2;
    return Math.max(100, baseScore - penalty);
  };

  const saveScore = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để lưu điểm");
      return;
    }

    try {
      const { error } = await supabase.from("game_scores").insert({
        user_id: user.id,
        game_type: "number-sort",
        score: getScore(),
      });

      if (error) throw error;
      toast.success("Đã lưu điểm!");
      onClose();
    } catch (error) {
      toast.error("Không thể lưu điểm");
    }
  };

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">🔢 Sắp Xếp Số</h3>
          <p className="text-muted-foreground text-lg">Di chuyển ô để sắp xếp số theo thứ tự</p>
          <p className="text-sm text-muted-foreground mt-2">Click vào ô cạnh ô trống để di chuyển</p>
        </div>
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button 
            onClick={() => initGame(3)} 
            size="lg" 
            className="text-lg py-6 bg-green-500 hover:bg-green-600"
          >
            🌱 Dễ (3×3)
          </Button>
          <Button 
            onClick={() => initGame(4)} 
            size="lg" 
            className="text-lg py-6 bg-yellow-500 hover:bg-yellow-600"
          >
            🌿 Trung bình (4×4)
          </Button>
          <Button 
            onClick={() => initGame(5)} 
            size="lg" 
            className="text-lg py-6 bg-red-500 hover:bg-red-600"
          >
            🌳 Khó (5×5)
          </Button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-4 p-6"
      >
        <div className="text-6xl">🎉</div>
        <h3 className="text-2xl font-bold text-primary">Hoàn thành!</h3>
        <p className="text-xl">Điểm: {getScore()}</p>
        <p className="text-muted-foreground">Số bước: {moves}</p>
        <div className="flex gap-3">
          <Button onClick={() => initGame(gridSize)} variant="outline" size="lg">
            Chơi lại
          </Button>
          <Button onClick={saveScore} size="lg">
            Lưu điểm
          </Button>
        </div>
      </motion.div>
    );
  }

  const tileSize = gridSize === 3 ? "w-20 h-20 text-3xl" : gridSize === 4 ? "w-16 h-16 text-2xl" : "w-12 h-12 text-xl";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex justify-between w-full px-4">
        <span className="text-lg font-medium">
          Kích thước: {gridSize}×{gridSize}
        </span>
        <span className="text-lg font-medium">Bước: {moves}</span>
      </div>

      {/* Grid */}
      <div
        className="grid gap-2 p-3 bg-muted rounded-xl"
        style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      >
        {grid.map((value, index) => (
          <motion.button
            key={index}
            whileHover={value !== null ? { scale: 1.05 } : {}}
            whileTap={value !== null ? { scale: 0.95 } : {}}
            onClick={() => handleTileClick(index)}
            className={`
              ${tileSize} rounded-lg font-bold
              flex items-center justify-center
              transition-all duration-200
              ${
                value !== null
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-lg cursor-pointer"
                  : "bg-transparent"
              }
            `}
            disabled={value === null}
          >
            {value}
          </motion.button>
        ))}
      </div>

      {/* Target reference */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Mục tiêu: Sắp xếp từ 1 đến {gridSize * gridSize - 1}</p>
        <div className="flex gap-1 justify-center flex-wrap max-w-[200px]">
          {[...Array(gridSize * gridSize - 1)].map((_, i) => (
            <span key={i} className="text-xs bg-muted px-1 rounded">{i + 1}</span>
          ))}
          <span className="text-xs bg-muted px-1 rounded">⬜</span>
        </div>
      </div>

      <Button onClick={() => setGameStarted(false)} variant="ghost">
        Đổi độ khó
      </Button>
    </div>
  );
}
