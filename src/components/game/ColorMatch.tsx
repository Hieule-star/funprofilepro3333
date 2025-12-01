import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface ColorMatchProps {
  onClose: () => void;
}

const COLORS = [
  { name: "Đỏ", bg: "bg-red-500", hex: "#ef4444" },
  { name: "Xanh lá", bg: "bg-green-500", hex: "#22c55e" },
  { name: "Xanh dương", bg: "bg-blue-500", hex: "#3b82f6" },
  { name: "Vàng", bg: "bg-yellow-400", hex: "#facc15" },
  { name: "Tím", bg: "bg-purple-500", hex: "#a855f7" },
  { name: "Hồng", bg: "bg-pink-500", hex: "#ec4899" },
  { name: "Cam", bg: "bg-orange-500", hex: "#f97316" },
  { name: "Xanh ngọc", bg: "bg-cyan-500", hex: "#06b6d4" },
];

interface ColorCard {
  id: number;
  colorIndex: number;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function ColorMatch({ onClose }: ColorMatchProps) {
  const { user } = useAuth();
  const [cards, setCards] = useState<ColorCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const colorPairs = [...Array(8).keys()].flatMap((i) => [i, i]);
    const shuffled = colorPairs.sort(() => Math.random() - 0.5);
    const newCards = shuffled.map((colorIndex, index) => ({
      id: index,
      colorIndex,
      isFlipped: false,
      isMatched: false,
    }));
    setCards(newCards);
    setFlippedCards([]);
    setMoves(0);
    setIsComplete(false);
    setScore(0);
  };

  const handleCardClick = (cardId: number) => {
    if (flippedCards.length === 2) return;
    
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    const newCards = cards.map((c) =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((prev) => prev + 1);
      const [first, second] = newFlipped;
      const firstCard = newCards.find((c) => c.id === first);
      const secondCard = newCards.find((c) => c.id === second);

      if (firstCard && secondCard && firstCard.colorIndex === secondCard.colorIndex) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second ? { ...c, isMatched: true } : c
            )
          );
          setFlippedCards([]);

          const allMatched = newCards.filter((c) => !c.isMatched).length === 2;
          if (allMatched) {
            const finalScore = Math.max(100, 1000 - moves * 20);
            setScore(finalScore);
            setIsComplete(true);
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        }, 300);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second ? { ...c, isFlipped: false } : c
            )
          );
          setFlippedCards([]);
        }, 800);
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
        game_type: "color-match",
        score: score,
      });

      if (error) throw error;
      toast.success(`Đã lưu ${score} điểm!`);
      onClose();
    } catch (error) {
      console.error("Error saving score:", error);
      toast.error("Không thể lưu điểm");
    }
  };

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="text-6xl mb-4">🎨✨</div>
        <h2 className="text-2xl font-bold mb-2">Tuyệt vời!</h2>
        <p className="text-muted-foreground mb-2">
          Bạn đã hoàn thành trong {moves} lượt
        </p>
        <p className="text-3xl font-bold text-primary mb-6">{score} điểm</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={initGame} variant="outline">
            Chơi lại
          </Button>
          <Button onClick={saveScore}>Lưu điểm & Thoát</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Lượt: {moves}</span>
        <Button variant="ghost" size="sm" onClick={initGame}>
          Chơi lại
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <AnimatePresence>
          {cards.map((card) => (
            <motion.div
              key={card.id}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="aspect-square"
            >
              <Card
                className={`w-full h-full cursor-pointer flex items-center justify-center transition-all ${
                  card.isMatched
                    ? "opacity-0"
                    : card.isFlipped
                    ? COLORS[card.colorIndex].bg
                    : "bg-muted hover:bg-muted/80"
                }`}
                onClick={() => handleCardClick(card.id)}
              >
                {!card.isFlipped && !card.isMatched && (
                  <span className="text-2xl">❓</span>
                )}
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Ghép các ô có màu giống nhau 🌈
      </p>
    </div>
  );
}
