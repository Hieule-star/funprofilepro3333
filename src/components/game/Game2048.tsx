import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useGameSounds } from "@/hooks/useGameSounds";

interface Game2048Props {
  onClose: () => void;
}

type Grid = number[][];

const COLORS: { [key: number]: string } = {
  0: "bg-muted",
  2: "bg-amber-100 text-amber-900",
  4: "bg-amber-200 text-amber-900",
  8: "bg-orange-300 text-white",
  16: "bg-orange-400 text-white",
  32: "bg-orange-500 text-white",
  64: "bg-red-400 text-white",
  128: "bg-yellow-300 text-yellow-900",
  256: "bg-yellow-400 text-yellow-900",
  512: "bg-yellow-500 text-white",
  1024: "bg-yellow-600 text-white",
  2048: "bg-yellow-700 text-white",
};

export default function Game2048({ onClose }: Game2048Props) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  const [grid, setGrid] = useState<Grid>([]);
  const [score, setScore] = useState(0);
  const [bestTile, setBestTile] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);

  const initGame = useCallback(() => {
    const newGrid: Grid = Array(4).fill(null).map(() => Array(4).fill(0));
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setBestTile(2);
    setIsGameOver(false);
    setIsWon(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const addRandomTile = (g: Grid) => {
    const empty: [number, number][] = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (g[i][j] === 0) empty.push([i, j]);
      }
    }
    if (empty.length > 0) {
      const [row, col] = empty[Math.floor(Math.random() * empty.length)];
      g[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
  };

  const canMove = (g: Grid): boolean => {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (g[i][j] === 0) return true;
        if (j < 3 && g[i][j] === g[i][j + 1]) return true;
        if (i < 3 && g[i][j] === g[i + 1][j]) return true;
      }
    }
    return false;
  };

  const move = useCallback((direction: "up" | "down" | "left" | "right") => {
    if (isGameOver) return;

    const newGrid = grid.map(row => [...row]);
    let moved = false;
    let addedScore = 0;
    let maxTile = bestTile;

    const slide = (row: number[]): number[] => {
      const filtered = row.filter(x => x !== 0);
      const result: number[] = [];
      
      for (let i = 0; i < filtered.length; i++) {
        if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
          const merged = filtered[i] * 2;
          result.push(merged);
          addedScore += merged;
          maxTile = Math.max(maxTile, merged);
          i++;
          moved = true;
        } else {
          result.push(filtered[i]);
        }
      }
      
      while (result.length < 4) result.push(0);
      return result;
    };

    if (direction === "left") {
      for (let i = 0; i < 4; i++) {
        const original = [...newGrid[i]];
        newGrid[i] = slide(newGrid[i]);
        if (original.join() !== newGrid[i].join()) moved = true;
      }
    } else if (direction === "right") {
      for (let i = 0; i < 4; i++) {
        const original = [...newGrid[i]];
        newGrid[i] = slide(newGrid[i].reverse()).reverse();
        if (original.join() !== newGrid[i].join()) moved = true;
      }
    } else if (direction === "up") {
      for (let j = 0; j < 4; j++) {
        const col = [newGrid[0][j], newGrid[1][j], newGrid[2][j], newGrid[3][j]];
        const original = [...col];
        const slid = slide(col);
        if (original.join() !== slid.join()) moved = true;
        for (let i = 0; i < 4; i++) newGrid[i][j] = slid[i];
      }
    } else if (direction === "down") {
      for (let j = 0; j < 4; j++) {
        const col = [newGrid[0][j], newGrid[1][j], newGrid[2][j], newGrid[3][j]];
        const original = [...col];
        const slid = slide(col.reverse()).reverse();
        if (original.join() !== slid.join()) moved = true;
        for (let i = 0; i < 4; i++) newGrid[i][j] = slid[i];
      }
    }

    if (moved) {
      addRandomTile(newGrid);
      setGrid(newGrid);
      setScore(prev => prev + addedScore);
      setBestTile(maxTile);

      if (addedScore > 0) playCorrect();

      if (maxTile >= 2048 && !isWon) {
        setIsWon(true);
        playCelebration();
        confetti({ particleCount: 100, spread: 70 });
      }

      if (!canMove(newGrid)) {
        setIsGameOver(true);
        playCelebration();
      }
    }
  }, [grid, isGameOver, bestTile, isWon, playCorrect, playCelebration]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const dir = e.key.replace("Arrow", "").toLowerCase() as "up" | "down" | "left" | "right";
        move(dir);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [move]);

  const saveScore = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để lưu điểm");
      return;
    }

    try {
      const { error } = await supabase.from("game_scores").insert({
        user_id: user.id,
        game_type: "game-2048",
        score: score,
      });

      if (error) throw error;
      toast.success("Đã lưu điểm!");
      onClose();
    } catch (error) {
      console.error("Error saving score:", error);
      toast.error("Không thể lưu điểm");
    }
  };

  if (isGameOver || isWon) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="text-6xl mb-4">{isWon ? "🏆" : "🔲"}</div>
        <h2 className="text-2xl font-bold mb-2">
          {isWon ? "Chiến thắng! 2048!" : "Game Over!"}
        </h2>
        <p className="text-muted-foreground mb-2">Ô cao nhất: {bestTile}</p>
        <p className="text-3xl font-bold text-primary mb-6">{score} điểm</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={initGame} variant="outline">Chơi lại</Button>
          <Button onClick={saveScore}>Lưu điểm</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Ô cao nhất: {bestTile}</span>
        <span className="text-lg font-bold text-primary">{score} điểm</span>
      </div>

      <div className="grid grid-cols-4 gap-2 p-3 bg-muted/50 rounded-xl">
        {grid.map((row, i) =>
          row.map((cell, j) => (
            <motion.div
              key={`${i}-${j}`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={`aspect-square flex items-center justify-center rounded-lg font-bold text-lg ${
                COLORS[cell] || "bg-yellow-800 text-white"
              }`}
            >
              {cell > 0 ? cell : ""}
            </motion.div>
          ))
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div />
        <Button variant="outline" onClick={() => move("up")}>↑</Button>
        <div />
        <Button variant="outline" onClick={() => move("left")}>←</Button>
        <Button variant="outline" onClick={() => move("down")}>↓</Button>
        <Button variant="outline" onClick={() => move("right")}>→</Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Dùng phím mũi tên hoặc nút bấm để di chuyển
      </p>
    </div>
  );
}
