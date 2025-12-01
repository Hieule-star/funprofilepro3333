import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGameSounds } from "@/hooks/useGameSounds";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

interface JigsawPuzzleProps {
  onClose: () => void;
}

interface Piece {
  id: number;
  currentPos: number;
  correctPos: number;
  emoji: string;
}

const PUZZLES = [
  {
    name: "Phong cảnh",
    emojis: ["🌅", "🏔️", "🌲", "🏠", "🌻", "🦋", "🌈", "☀️", "🐦"],
  },
  {
    name: "Động vật",
    emojis: ["🦁", "🐘", "🦒", "🐵", "🦜", "🐢", "🦩", "🐆", "🦓"],
  },
  {
    name: "Món ăn",
    emojis: ["🍕", "🍔", "🍣", "🍜", "🍰", "🍦", "🥗", "🍝", "🍱"],
  },
  {
    name: "Biển cả",
    emojis: ["🐳", "🐙", "🦈", "🐠", "🦑", "🐚", "🌊", "⚓", "🏝️"],
  },
];

export default function JigsawPuzzle({ onClose }: JigsawPuzzleProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const initPuzzle = (index: number) => {
    const puzzle = PUZZLES[index];
    const shuffled = [...Array(9).keys()].sort(() => Math.random() - 0.5);
    
    const newPieces: Piece[] = puzzle.emojis.map((emoji, i) => ({
      id: i,
      currentPos: shuffled[i],
      correctPos: i,
      emoji,
    }));
    
    setPieces(newPieces);
    setSelectedPiece(null);
    setMoves(0);
    setIsComplete(false);
  };

  const startGame = () => {
    initPuzzle(0);
    setPuzzleIndex(0);
    setGameStarted(true);
  };

  const handlePieceClick = (clickedPos: number) => {
    const clickedPiece = pieces.find((p) => p.currentPos === clickedPos);
    if (!clickedPiece) return;

    if (selectedPiece === null) {
      setSelectedPiece(clickedPos);
    } else {
      // Swap pieces
      const newPieces = pieces.map((p) => {
        if (p.currentPos === selectedPiece) {
          return { ...p, currentPos: clickedPos };
        }
        if (p.currentPos === clickedPos) {
          return { ...p, currentPos: selectedPiece };
        }
        return p;
      });

      setPieces(newPieces);
      setSelectedPiece(null);
      setMoves((m) => m + 1);
      playCorrect();

      // Check completion
      const isCorrect = newPieces.every((p) => p.currentPos === p.correctPos);
      if (isCorrect) {
        if (puzzleIndex < PUZZLES.length - 1) {
          setTimeout(() => {
            setPuzzleIndex((i) => i + 1);
            initPuzzle(puzzleIndex + 1);
          }, 1000);
          confetti({ particleCount: 50, spread: 50 });
        } else {
          setIsComplete(true);
          playCelebration();
          confetti({ particleCount: 200, spread: 100 });
        }
      }
    }
  };

  const getScore = () => {
    const baseScore = (puzzleIndex + 1) * 500;
    const movePenalty = Math.max(0, moves - 20) * 5;
    return Math.max(100, baseScore - movePenalty);
  };

  const saveScore = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để lưu điểm");
      return;
    }

    try {
      const { error } = await supabase.from("game_scores").insert({
        user_id: user.id,
        game_type: "jigsaw-puzzle",
        score: getScore(),
      });

      if (error) throw error;
      toast.success(`Đã lưu ${getScore()} điểm!`);
      onClose();
    } catch (error) {
      toast.error("Không thể lưu điểm");
    }
  };

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">🧩 Ghép Hình Thư Giãn</h3>
          <p className="text-muted-foreground text-lg">Sắp xếp lại các mảnh ghép về đúng vị trí</p>
          <p className="text-sm text-muted-foreground mt-2">Click 2 mảnh để hoán đổi vị trí</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {PUZZLES.map((puzzle, i) => (
            <div key={i} className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl mb-1">{puzzle.emojis[0]}</div>
              <p className="text-sm">{puzzle.name}</p>
            </div>
          ))}
        </div>
        
        <Button onClick={startGame} size="lg" className="text-lg px-8 py-6">
          🎮 Bắt đầu chơi
        </Button>
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
        <div className="text-6xl">🎊</div>
        <h3 className="text-2xl font-bold text-primary">Tuyệt vời!</h3>
        <p className="text-xl">Tổng điểm: {getScore()}</p>
        <p className="text-muted-foreground">Tổng số bước: {moves}</p>
        <div className="flex gap-3">
          <Button onClick={startGame} variant="outline" size="lg">
            Chơi lại
          </Button>
          <Button onClick={saveScore} size="lg">
            Lưu điểm & Thoát
          </Button>
        </div>
      </motion.div>
    );
  }

  const currentPuzzle = PUZZLES[puzzleIndex];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex justify-between w-full px-4">
        <span className="text-lg font-medium">
          Màn {puzzleIndex + 1}/{PUZZLES.length}: {currentPuzzle.name}
        </span>
        <span className="text-lg font-medium">Bước: {moves}</span>
      </div>

      {/* Reference image */}
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground mb-1">Hình mẫu:</p>
        <div className="flex gap-1 justify-center">
          {currentPuzzle.emojis.map((emoji, i) => (
            <span key={i} className="text-lg">{emoji}</span>
          ))}
        </div>
      </div>

      {/* Puzzle grid */}
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((pos) => {
          const piece = pieces.find((p) => p.currentPos === pos);
          const isSelected = selectedPiece === pos;
          const isCorrect = piece && piece.currentPos === piece.correctPos;

          return (
            <motion.button
              key={pos}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePieceClick(pos)}
              className={`
                w-16 h-16 sm:w-20 sm:h-20 rounded-xl text-4xl sm:text-5xl
                flex items-center justify-center
                transition-all duration-200
                ${isSelected ? "ring-4 ring-primary bg-primary/20" : "bg-muted hover:bg-accent"}
                ${isCorrect ? "bg-green-100 dark:bg-green-900/30" : ""}
              `}
            >
              {piece?.emoji}
            </motion.button>
          );
        })}
      </div>

      <p className="text-muted-foreground text-sm">
        💡 Tip: Các mảnh đúng vị trí sẽ có nền xanh
      </p>

      <Button onClick={() => setGameStarted(false)} variant="ghost">
        Quay lại
      </Button>
    </div>
  );
}
