import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGameSounds } from "@/hooks/useGameSounds";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

interface SudokuProps {
  onClose: () => void;
}

type Difficulty = "easy" | "medium" | "hard";

const generateSudoku = (difficulty: Difficulty): { puzzle: number[][], solution: number[][] } => {
  // Create a valid solved sudoku
  const solution: number[][] = Array(9).fill(null).map(() => Array(9).fill(0));
  
  const isValid = (board: number[][], row: number, col: number, num: number): boolean => {
    for (let x = 0; x < 9; x++) {
      if (board[row][x] === num || board[x][col] === num) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[boxRow + i][boxCol + j] === num) return false;
      }
    }
    return true;
  };

  const fillBoard = (board: number[][]): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (const num of nums) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              if (fillBoard(board)) return true;
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  fillBoard(solution);

  // Create puzzle by removing numbers
  const puzzle = solution.map(row => [...row]);
  const cellsToRemove = difficulty === "easy" ? 30 : difficulty === "medium" ? 40 : 50;
  
  let removed = 0;
  while (removed < cellsToRemove) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (puzzle[row][col] !== 0) {
      puzzle[row][col] = 0;
      removed++;
    }
  }

  return { puzzle, solution };
};

export default function Sudoku({ onClose }: SudokuProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [board, setBoard] = useState<number[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [initialBoard, setInitialBoard] = useState<number[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  const startGame = (diff: Difficulty) => {
    const { puzzle, solution: sol } = generateSudoku(diff);
    setBoard(puzzle.map(row => [...row]));
    setInitialBoard(puzzle.map(row => [...row]));
    setSolution(sol);
    setDifficulty(diff);
    setSelectedCell(null);
    setIsComplete(false);
    setMistakes(0);
    setGameStarted(true);
  };

  const handleCellClick = (row: number, col: number) => {
    if (initialBoard[row][col] === 0) {
      setSelectedCell({ row, col });
    }
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = num;
    setBoard(newBoard);

    if (num !== 0 && num !== solution[row][col]) {
      setMistakes(m => m + 1);
    } else if (num === solution[row][col]) {
      playCorrect();
    }

    // Check if complete
    const isCorrect = newBoard.every((r, ri) => 
      r.every((c, ci) => c === solution[ri][ci])
    );
    
    if (isCorrect) {
      setIsComplete(true);
      playCelebration();
      confetti({ particleCount: 150, spread: 80 });
    }
  };

  const getScore = () => {
    const baseScore = difficulty === "easy" ? 500 : difficulty === "medium" ? 1000 : 1500;
    return Math.max(100, baseScore - mistakes * 50);
  };

  const saveScore = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để lưu điểm");
      return;
    }

    try {
      const { error } = await supabase.from("game_scores").insert({
        user_id: user.id,
        game_type: "sudoku",
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
          <h3 className="text-2xl font-bold mb-2">🔢 Sudoku</h3>
          <p className="text-muted-foreground text-lg">Điền số 1-9 vào ô trống</p>
          <p className="text-sm text-muted-foreground mt-2">Mỗi hàng, cột và ô 3x3 chứa đủ số 1-9</p>
        </div>
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button 
            onClick={() => startGame("easy")} 
            size="lg" 
            className="text-lg py-6 bg-green-500 hover:bg-green-600"
          >
            🌱 Dễ (30 ô trống)
          </Button>
          <Button 
            onClick={() => startGame("medium")} 
            size="lg" 
            className="text-lg py-6 bg-yellow-500 hover:bg-yellow-600"
          >
            🌿 Trung bình (40 ô trống)
          </Button>
          <Button 
            onClick={() => startGame("hard")} 
            size="lg" 
            className="text-lg py-6 bg-red-500 hover:bg-red-600"
          >
            🌳 Khó (50 ô trống)
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
        <h3 className="text-2xl font-bold text-primary">Xuất sắc!</h3>
        <p className="text-xl">Điểm: {getScore()}</p>
        <p className="text-muted-foreground">Số lỗi: {mistakes}</p>
        <div className="flex gap-3">
          <Button onClick={() => startGame(difficulty)} variant="outline" size="lg">
            Chơi lại
          </Button>
          <Button onClick={saveScore} size="lg">
            Lưu điểm & Thoát
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex justify-between w-full px-2">
        <span className="text-lg font-medium">Độ khó: {difficulty === "easy" ? "Dễ" : difficulty === "medium" ? "TB" : "Khó"}</span>
        <span className="text-lg font-medium text-destructive">Lỗi: {mistakes}</span>
      </div>

      {/* Sudoku Board */}
      <div className="grid grid-cols-9 gap-0 border-2 border-primary rounded-lg overflow-hidden">
        {board.map((row, ri) =>
          row.map((cell, ci) => (
            <button
              key={`${ri}-${ci}`}
              onClick={() => handleCellClick(ri, ci)}
              className={`
                w-8 h-8 sm:w-10 sm:h-10 text-lg sm:text-xl font-bold
                flex items-center justify-center
                border border-border/50
                ${ci % 3 === 2 && ci < 8 ? "border-r-2 border-r-primary" : ""}
                ${ri % 3 === 2 && ri < 8 ? "border-b-2 border-b-primary" : ""}
                ${initialBoard[ri][ci] !== 0 ? "bg-muted text-foreground" : "bg-background"}
                ${selectedCell?.row === ri && selectedCell?.col === ci ? "bg-primary/20 ring-2 ring-primary" : ""}
                ${cell !== 0 && cell !== solution[ri][ci] ? "text-destructive" : ""}
                ${cell !== 0 && initialBoard[ri][ci] === 0 && cell === solution[ri][ci] ? "text-primary" : ""}
                hover:bg-accent transition-colors
              `}
              disabled={initialBoard[ri][ci] !== 0}
            >
              {cell !== 0 ? cell : ""}
            </button>
          ))
        )}
      </div>

      {/* Number Input */}
      <div className="grid grid-cols-5 gap-2 mt-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
          <Button
            key={num}
            onClick={() => handleNumberInput(num)}
            variant={num === 0 ? "destructive" : "outline"}
            size="lg"
            className="w-12 h-12 text-xl font-bold"
            disabled={!selectedCell}
          >
            {num === 0 ? "✕" : num}
          </Button>
        ))}
      </div>

      <Button onClick={() => setGameStarted(false)} variant="ghost" className="mt-2">
        Đổi độ khó
      </Button>
    </div>
  );
}
