import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { Shuffle } from "lucide-react";

interface MemoryGameProps {
  onClose: () => void;
}

const emojis = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼"];

export default function MemoryGame({ onClose }: MemoryGameProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    initializeGame();
  }, []);

  useEffect(() => {
    if (flipped.length === 2) {
      const [first, second] = flipped;
      if (cards[first] === cards[second]) {
        setMatched([...matched, first, second]);
        setFlipped([]);

        if (matched.length + 2 === cards.length) {
          setTimeout(() => {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
            saveScore();
          }, 500);
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
      setMoves(moves + 1);
    }
  }, [flipped]);

  const initializeGame = () => {
    const shuffled = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  };

  const handleCardClick = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) {
      return;
    }
    setFlipped([...flipped, index]);
  };

  const saveScore = async () => {
    if (!user) return;

    const score = Math.max(1000 - moves * 5, 100);
    const { error } = await supabase.from("game_scores").insert({
      user_id: user.id,
      game_type: "memory-cards",
      score,
    });

    if (!error) {
      toast({
        title: "Chúc mừng! 🎉",
        description: `Bạn đã hoàn thành với ${moves} lượt và được ${score} điểm!`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-lg">
          Số lượt: <span className="font-bold text-primary">{moves}</span>
        </div>
        <Button onClick={initializeGame} variant="outline" size="sm" className="gap-2">
          <Shuffle className="h-4 w-4" />
          Chơi lại
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
        {cards.map((card, index) => {
          const isFlipped = flipped.includes(index) || matched.includes(index);
          return (
            <button
              key={index}
              onClick={() => handleCardClick(index)}
              className={`
                aspect-square rounded-lg text-4xl font-bold transition-all
                ${
                  isFlipped
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent hover:bg-accent/80"
                }
                ${matched.includes(index) && "opacity-50"}
              `}
            >
              {isFlipped ? card : "?"}
            </button>
          );
        })}
      </div>

      {matched.length === cards.length && (
        <div className="text-center">
          <p className="text-lg font-bold text-primary mb-4">
            Hoàn thành trong {moves} lượt! 🎉
          </p>
          <Button onClick={onClose}>Đóng</Button>
        </div>
      )}
    </div>
  );
}
