import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGameSounds } from "@/hooks/useGameSounds";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

interface GomokuProps {
  onClose: () => void;
}

type Cell = "X" | "O" | null;
type Board = Cell[][];

const BOARD_SIZE = 10;
const WIN_LENGTH = 5;

export default function Gomoku({ onClose }: GomokuProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  const [board, setBoard] = useState<Board>(() =>
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  );
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<"X" | "O" | "draw" | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerWins, setPlayerWins] = useState(0);
  const [aiWins, setAiWins] = useState(0);

  const checkWinner = (board: Board, row: number, col: number): Cell => {
    const cell = board[row][col];
    if (!cell) return null;

    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal down-right
      [1, -1],  // diagonal down-left
    ];

    for (const [dr, dc] of directions) {
      let count = 1;
      
      // Check forward
      for (let i = 1; i < WIN_LENGTH; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === cell) {
          count++;
        } else break;
      }
      
      // Check backward
      for (let i = 1; i < WIN_LENGTH; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === cell) {
          count++;
        } else break;
      }

      if (count >= WIN_LENGTH) return cell;
    }

    return null;
  };

  const evaluatePosition = (board: Board, row: number, col: number, player: Cell): number => {
    if (!player) return 0;
    let score = 0;
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (const [dr, dc] of directions) {
      let count = 1;
      let openEnds = 0;

      // Forward
      for (let i = 1; i < 5; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          if (board[r][c] === player) count++;
          else if (board[r][c] === null) { openEnds++; break; }
          else break;
        }
      }

      // Backward
      for (let i = 1; i < 5; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
          if (board[r][c] === player) count++;
          else if (board[r][c] === null) { openEnds++; break; }
          else break;
        }
      }

      if (count >= 5) score += 100000;
      else if (count === 4 && openEnds >= 1) score += 10000;
      else if (count === 3 && openEnds === 2) score += 1000;
      else if (count === 2 && openEnds === 2) score += 100;
    }

    return score;
  };

  const findBestMove = (board: Board): { row: number; col: number } | null => {
    let bestScore = -Infinity;
    let bestMove: { row: number; col: number } | null = null;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === null) {
          // Check if near existing pieces
          let hasNeighbor = false;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc]) {
                hasNeighbor = true;
                break;
              }
            }
            if (hasNeighbor) break;
          }

          if (!hasNeighbor && bestMove) continue;

          const aiScore = evaluatePosition(board, r, c, "O");
          const blockScore = evaluatePosition(board, r, c, "X") * 0.9;
          const totalScore = aiScore + blockScore;

          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestMove = { row: r, col: c };
          }
        }
      }
    }

    // If no good move found, pick center or random
    if (!bestMove) {
      const center = Math.floor(BOARD_SIZE / 2);
      if (!board[center][center]) {
        bestMove = { row: center, col: center };
      } else {
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (!board[r][c]) {
              bestMove = { row: r, col: c };
              break;
            }
          }
          if (bestMove) break;
        }
      }
    }

    return bestMove;
  };

  const handleCellClick = (row: number, col: number) => {
    if (!isPlayerTurn || board[row][col] || winner) return;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = "X";
    setBoard(newBoard);
    playCorrect();

    const playerWin = checkWinner(newBoard, row, col);
    if (playerWin) {
      setWinner("X");
      setPlayerWins(w => w + 1);
      playCelebration();
      confetti({ particleCount: 150, spread: 80 });
      return;
    }

    // Check draw
    const isDraw = newBoard.every(r => r.every(c => c !== null));
    if (isDraw) {
      setWinner("draw");
      return;
    }

    setIsPlayerTurn(false);

    // AI move
    setTimeout(() => {
      const aiMove = findBestMove(newBoard);
      if (aiMove) {
        newBoard[aiMove.row][aiMove.col] = "O";
        setBoard([...newBoard.map(r => [...r])]);

        const aiWin = checkWinner(newBoard, aiMove.row, aiMove.col);
        if (aiWin) {
          setWinner("O");
          setAiWins(w => w + 1);
        } else {
          const isDraw = newBoard.every(r => r.every(c => c !== null));
          if (isDraw) setWinner("draw");
        }
      }
      setIsPlayerTurn(true);
    }, 500);
  };

  const resetGame = () => {
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
    setIsPlayerTurn(true);
    setWinner(null);
  };

  const startGame = () => {
    resetGame();
    setPlayerWins(0);
    setAiWins(0);
    setGameStarted(true);
  };

  const saveScore = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để lưu điểm");
      return;
    }

    const score = playerWins * 500;
    try {
      const { error } = await supabase.from("game_scores").insert({
        user_id: user.id,
        game_type: "gomoku",
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
          <h3 className="text-2xl font-bold mb-2">⭕ Cờ Caro (Gomoku)</h3>
          <p className="text-muted-foreground text-lg">Xếp 5 quân liên tiếp để thắng</p>
          <p className="text-sm text-muted-foreground mt-2">Đấu với máy - Bạn đi trước (X)</p>
        </div>

        <div className="bg-muted p-4 rounded-lg text-center">
          <p className="text-lg">🎯 Bàn cờ {BOARD_SIZE}×{BOARD_SIZE}</p>
          <p className="text-muted-foreground mt-1">Cần {WIN_LENGTH} quân liên tiếp để thắng</p>
        </div>
        
        <Button onClick={startGame} size="lg" className="text-lg px-8 py-6">
          🎮 Bắt đầu chơi
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex justify-between w-full px-2">
        <span className="text-lg font-medium">
          Bạn (X): {playerWins} 🏆
        </span>
        <span className="text-lg font-medium">
          Máy (O): {aiWins} 🤖
        </span>
      </div>

      {winner && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-2"
        >
          <p className="text-xl font-bold text-primary">
            {winner === "X" ? "🎉 Bạn thắng!" : winner === "O" ? "🤖 Máy thắng!" : "🤝 Hòa!"}
          </p>
        </motion.div>
      )}

      {/* Game board */}
      <div 
        className="grid gap-0 border-2 border-primary rounded-lg overflow-hidden bg-amber-50 dark:bg-amber-900/20"
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}
      >
        {board.map((row, ri) =>
          row.map((cell, ci) => (
            <button
              key={`${ri}-${ci}`}
              onClick={() => handleCellClick(ri, ci)}
              className={`
                w-7 h-7 sm:w-8 sm:h-8 
                border border-amber-300 dark:border-amber-700
                flex items-center justify-center
                text-lg sm:text-xl font-bold
                hover:bg-amber-100 dark:hover:bg-amber-800/50
                transition-colors
                ${cell === "X" ? "text-blue-600" : cell === "O" ? "text-red-600" : ""}
              `}
              disabled={!isPlayerTurn || winner !== null}
            >
              {cell}
            </button>
          ))
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {!winner && (isPlayerTurn ? "👉 Lượt của bạn (X)" : "🤔 Máy đang suy nghĩ...")}
      </p>

      <div className="flex gap-3">
        {winner && (
          <Button onClick={resetGame} variant="outline" size="lg">
            Ván mới
          </Button>
        )}
        <Button onClick={saveScore} size="lg">
          Lưu điểm
        </Button>
      </div>
    </div>
  );
}
