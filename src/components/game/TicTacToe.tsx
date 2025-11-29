import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { Shuffle } from "lucide-react";

interface TicTacToeProps {
  onClose: () => void;
}

export default function TicTacToe({ onClose }: TicTacToeProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const handleClick = async (index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = isXNext ? "X" : "O";
    setBoard(newBoard);
    setIsXNext(!isXNext);

    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      if (user) {
        await supabase.from("game_scores").insert({
          user_id: user.id,
          game_type: "tic-tac-toe",
          score: 100,
        });
      }

      toast({
        title: "Chúc mừng! 🎉",
        description: `Người chơi ${gameWinner} đã thắng!`,
      });
    } else if (newBoard.every((cell) => cell !== null)) {
      toast({
        title: "Hòa! 🤝",
        description: "Trò chơi kết thúc với kết quả hòa.",
      });
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-lg">
          Lượt:{" "}
          <span className="font-bold text-primary">{winner ? `${winner} thắng!` : isXNext ? "X" : "O"}</span>
        </div>
        <Button onClick={resetGame} variant="outline" size="sm" className="gap-2">
          <Shuffle className="h-4 w-4" />
          Chơi lại
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleClick(index)}
            className={`
              aspect-square rounded-lg text-5xl font-bold transition-all
              bg-accent hover:bg-accent/80 active:scale-95
              ${cell && "bg-primary text-primary-foreground"}
            `}
          >
            {cell}
          </button>
        ))}
      </div>

      {winner && (
        <div className="text-center">
          <Button onClick={onClose} className="mt-4">
            Đóng
          </Button>
        </div>
      )}
    </div>
  );
}
