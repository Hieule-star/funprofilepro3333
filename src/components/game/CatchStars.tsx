import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useGameSounds } from "@/hooks/useGameSounds";

interface CatchStarsProps {
  onClose: () => void;
}

interface Star {
  id: number;
  x: number;
  y: number;
  type: "gold" | "blue";
  speed: number;
}

export default function CatchStars({ onClose }: CatchStarsProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  const [stars, setStars] = useState<Star[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const starIdRef = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const startGame = useCallback(() => {
    setStars([]);
    setScore(0);
    setTimeLeft(30);
    setIsPlaying(true);
    setIsComplete(false);
    starIdRef.current = 0;
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const spawnInterval = setInterval(() => {
      const newStar: Star = {
        id: starIdRef.current++,
        x: Math.random() * 80 + 10,
        y: -10,
        type: Math.random() > 0.3 ? "gold" : "blue",
        speed: Math.random() * 2 + 1,
      };
      setStars((prev) => [...prev, newStar]);
    }, 800);

    return () => clearInterval(spawnInterval);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;

    const moveInterval = setInterval(() => {
      setStars((prev) =>
        prev
          .map((star) => ({ ...star, y: star.y + star.speed }))
          .filter((star) => star.y < 100)
      );
    }, 50);

    return () => clearInterval(moveInterval);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsPlaying(false);
          setIsComplete(true);
          if (score > 100) {
            playCelebration();
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, score]);

  const catchStar = (starId: number, starType: "gold" | "blue") => {
    playCorrect();
    setStars((prev) => prev.filter((s) => s.id !== starId));
    const points = starType === "gold" ? 10 : 5;
    setScore((prev) => prev + points);
  };

  const saveScore = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để lưu điểm");
      return;
    }

    try {
      const { error } = await supabase.from("game_scores").insert({
        user_id: user.id,
        game_type: "catch-stars",
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

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="text-6xl mb-4">⭐🌟</div>
        <h2 className="text-2xl font-bold mb-2">
          {score >= 200 ? "Xuất sắc!" : score >= 100 ? "Giỏi lắm!" : "Cố gắng hơn nhé!"}
        </h2>
        <p className="text-muted-foreground mb-2">
          Bạn đã bắt được nhiều sao!
        </p>
        <p className="text-3xl font-bold text-primary mb-6">{score} điểm</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={startGame} variant="outline">
            Chơi lại
          </Button>
          <Button onClick={saveScore}>Lưu điểm</Button>
        </div>
      </motion.div>
    );
  }

  if (!isPlaying) {
    return (
      <div className="text-center py-8 space-y-6">
        <div className="text-6xl">⭐</div>
        <h2 className="text-2xl font-bold">Catch Stars</h2>
        <p className="text-muted-foreground">
          Bắt các ngôi sao rơi xuống trong 30 giây!
        </p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="text-2xl">⭐</span> +10 điểm
          </span>
          <span className="flex items-center gap-1">
            <span className="text-2xl">💙</span> +5 điểm
          </span>
        </div>
        <Button onClick={startGame} size="lg">
          Bắt đầu
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-primary">{score} điểm</span>
        <span className={`text-sm font-bold ${timeLeft <= 10 ? "text-red-500" : ""}`}>
          ⏱️ {timeLeft}s
        </span>
      </div>

      <div
        ref={gameAreaRef}
        className="relative w-full h-[300px] bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-950 rounded-xl overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-50"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `twinkle ${Math.random() * 2 + 1}s infinite`,
              }}
            />
          ))}
        </div>

        <AnimatePresence>
          {stars.map((star) => (
            <motion.button
              key={star.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute text-3xl cursor-pointer hover:scale-125 transition-transform"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              onClick={() => catchStar(star.id, star.type)}
            >
              {star.type === "gold" ? "⭐" : "💙"}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Click vào các ngôi sao để bắt! 🌙
      </p>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
