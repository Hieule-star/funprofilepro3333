import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGameSounds } from "@/hooks/useGameSounds";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

interface SpotDifferenceProps {
  onClose: () => void;
}

interface DifferencePoint {
  x: number;
  y: number;
  found: boolean;
}

interface Level {
  id: number;
  name: string;
  differences: DifferencePoint[];
  baseElements: { emoji: string; x: number; y: number }[];
  changedElements: { emoji: string; x: number; y: number }[];
}

const LEVELS: Level[] = [
  {
    id: 1,
    name: "Khu vườn",
    differences: [
      { x: 20, y: 30, found: false },
      { x: 60, y: 50, found: false },
      { x: 80, y: 20, found: false },
    ],
    baseElements: [
      { emoji: "🌳", x: 10, y: 20 },
      { emoji: "🌸", x: 20, y: 30 },
      { emoji: "🏠", x: 50, y: 40 },
      { emoji: "🌻", x: 60, y: 50 },
      { emoji: "🐦", x: 80, y: 20 },
      { emoji: "☀️", x: 85, y: 10 },
      { emoji: "🌷", x: 30, y: 70 },
      { emoji: "🦋", x: 40, y: 25 },
    ],
    changedElements: [
      { emoji: "🌳", x: 10, y: 20 },
      { emoji: "🌺", x: 20, y: 30 }, // Changed
      { emoji: "🏠", x: 50, y: 40 },
      { emoji: "🌼", x: 60, y: 50 }, // Changed
      { emoji: "🐤", x: 80, y: 20 }, // Changed
      { emoji: "☀️", x: 85, y: 10 },
      { emoji: "🌷", x: 30, y: 70 },
      { emoji: "🦋", x: 40, y: 25 },
    ],
  },
  {
    id: 2,
    name: "Bãi biển",
    differences: [
      { x: 15, y: 60, found: false },
      { x: 50, y: 30, found: false },
      { x: 75, y: 70, found: false },
      { x: 35, y: 15, found: false },
    ],
    baseElements: [
      { emoji: "🌊", x: 50, y: 80 },
      { emoji: "🏖️", x: 15, y: 60 },
      { emoji: "⛱️", x: 30, y: 50 },
      { emoji: "🌴", x: 50, y: 30 },
      { emoji: "🦀", x: 75, y: 70 },
      { emoji: "🐚", x: 60, y: 65 },
      { emoji: "☀️", x: 35, y: 15 },
      { emoji: "🚤", x: 80, y: 40 },
    ],
    changedElements: [
      { emoji: "🌊", x: 50, y: 80 },
      { emoji: "🏝️", x: 15, y: 60 }, // Changed
      { emoji: "⛱️", x: 30, y: 50 },
      { emoji: "🌵", x: 50, y: 30 }, // Changed
      { emoji: "🦞", x: 75, y: 70 }, // Changed
      { emoji: "🐚", x: 60, y: 65 },
      { emoji: "🌙", x: 35, y: 15 }, // Changed
      { emoji: "🚤", x: 80, y: 40 },
    ],
  },
  {
    id: 3,
    name: "Thành phố",
    differences: [
      { x: 20, y: 40, found: false },
      { x: 45, y: 20, found: false },
      { x: 70, y: 60, found: false },
      { x: 85, y: 30, found: false },
      { x: 30, y: 75, found: false },
    ],
    baseElements: [
      { emoji: "🏢", x: 20, y: 40 },
      { emoji: "🏛️", x: 45, y: 20 },
      { emoji: "🚗", x: 70, y: 60 },
      { emoji: "🌳", x: 85, y: 30 },
      { emoji: "🚶", x: 30, y: 75 },
      { emoji: "🏪", x: 55, y: 50 },
      { emoji: "🚌", x: 15, y: 70 },
      { emoji: "🌤️", x: 80, y: 10 },
    ],
    changedElements: [
      { emoji: "🏨", x: 20, y: 40 }, // Changed
      { emoji: "🏰", x: 45, y: 20 }, // Changed
      { emoji: "🚕", x: 70, y: 60 }, // Changed
      { emoji: "🌲", x: 85, y: 30 }, // Changed
      { emoji: "🧑", x: 30, y: 75 }, // Changed
      { emoji: "🏪", x: 55, y: 50 },
      { emoji: "🚌", x: 15, y: 70 },
      { emoji: "🌤️", x: 80, y: 10 },
    ],
  },
];

export default function SpotDifference({ onClose }: SpotDifferenceProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  const [currentLevel, setCurrentLevel] = useState(0);
  const [differences, setDifferences] = useState<DifferencePoint[]>([]);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    if (gameStarted) {
      setDifferences(LEVELS[currentLevel].differences.map(d => ({ ...d, found: false })));
    }
  }, [currentLevel, gameStarted]);

  const startGame = () => {
    setCurrentLevel(0);
    setScore(0);
    setIsComplete(false);
    setGameStarted(true);
  };

  const handleClick = (x: number, y: number, isRightSide: boolean) => {
    if (!isRightSide) return;

    const clickRadius = 12;
    const foundDiff = differences.find(
      (d) => !d.found && Math.abs(d.x - x) < clickRadius && Math.abs(d.y - y) < clickRadius
    );

    if (foundDiff) {
      playCorrect();
      const newDiffs = differences.map((d) =>
        d.x === foundDiff.x && d.y === foundDiff.y ? { ...d, found: true } : d
      );
      setDifferences(newDiffs);
      setScore((s) => s + 100);

      // Check if all found
      if (newDiffs.every((d) => d.found)) {
        if (currentLevel < LEVELS.length - 1) {
          setTimeout(() => {
            setCurrentLevel((l) => l + 1);
          }, 1000);
        } else {
          setIsComplete(true);
          playCelebration();
          confetti({ particleCount: 200, spread: 100 });
        }
      }
    }
  };

  const saveScore = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để lưu điểm");
      return;
    }

    try {
      const { error } = await supabase.from("game_scores").insert({
        user_id: user.id,
        game_type: "spot-difference",
        score: score,
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
          <h3 className="text-2xl font-bold mb-2">🔍 Tìm Điểm Khác Biệt</h3>
          <p className="text-muted-foreground text-lg">So sánh 2 hình và tìm điểm khác nhau</p>
          <p className="text-sm text-muted-foreground mt-2">Click vào hình bên phải để đánh dấu</p>
        </div>
        
        <div className="text-center">
          <p className="text-lg mb-4">{LEVELS.length} màn chơi với độ khó tăng dần</p>
          <Button onClick={startGame} size="lg" className="text-lg px-8 py-6">
            🎮 Bắt đầu chơi
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
        <div className="text-6xl">🏆</div>
        <h3 className="text-2xl font-bold text-primary">Hoàn thành tất cả!</h3>
        <p className="text-xl">Tổng điểm: {score}</p>
        <div className="flex gap-3">
          <Button onClick={startGame} variant="outline" size="lg">
            Chơi lại
          </Button>
          <Button onClick={saveScore} size="lg">
            Lưu điểm
          </Button>
        </div>
      </motion.div>
    );
  }

  const level = LEVELS[currentLevel];
  const foundCount = differences.filter((d) => d.found).length;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex justify-between w-full px-4">
        <span className="text-lg font-medium">Màn {currentLevel + 1}: {level.name}</span>
        <span className="text-lg font-medium">
          Tìm thấy: {foundCount}/{differences.length}
        </span>
      </div>

      <div className="flex gap-2 flex-col sm:flex-row">
        {/* Left Image */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 bg-gradient-to-br from-sky-100 to-sky-200 dark:from-sky-900 dark:to-sky-800 rounded-xl border-2 border-border overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Hình gốc
          </div>
          {level.baseElements.map((el, i) => (
            <span
              key={i}
              className="absolute text-2xl sm:text-3xl"
              style={{ left: `${el.x}%`, top: `${el.y}%`, transform: "translate(-50%, -50%)" }}
            >
              {el.emoji}
            </span>
          ))}
        </div>

        {/* Right Image */}
        <div
          className="relative w-48 h-48 sm:w-56 sm:h-56 bg-gradient-to-br from-sky-100 to-sky-200 dark:from-sky-900 dark:to-sky-800 rounded-xl border-2 border-primary cursor-pointer overflow-hidden"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            handleClick(x, y, true);
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Click để tìm
          </div>
          {level.changedElements.map((el, i) => (
            <span
              key={i}
              className="absolute text-2xl sm:text-3xl"
              style={{ left: `${el.x}%`, top: `${el.y}%`, transform: "translate(-50%, -50%)" }}
            >
              {el.emoji}
            </span>
          ))}
          {/* Found markers */}
          {differences
            .filter((d) => d.found)
            .map((d, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute w-8 h-8 border-4 border-green-500 rounded-full"
                style={{ left: `${d.x}%`, top: `${d.y}%`, transform: "translate(-50%, -50%)" }}
              />
            ))}
        </div>
      </div>

      <p className="text-lg font-medium text-primary">Điểm: {score}</p>

      <Button onClick={() => setGameStarted(false)} variant="ghost">
        Quay lại
      </Button>
    </div>
  );
}
