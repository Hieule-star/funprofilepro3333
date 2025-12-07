import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useGameSounds } from "@/hooks/useGameSounds";

interface SimonSaysProps {
  onClose: () => void;
}

const COLORS = [
  { name: "red", bg: "bg-red-500", active: "bg-red-300", freq: 261.63 },
  { name: "blue", bg: "bg-blue-500", active: "bg-blue-300", freq: 329.63 },
  { name: "yellow", bg: "bg-yellow-500", active: "bg-yellow-300", freq: 392.0 },
  { name: "green", bg: "bg-green-500", active: "bg-green-300", freq: 523.25 },
];

export default function SimonSays({ onClose }: SimonSaysProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [activeColor, setActiveColor] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [highestRound, setHighestRound] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playTone = useCallback((frequency: number, duration: number = 300) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration / 1000);
  }, []);

  const flashColor = useCallback((colorIndex: number) => {
    return new Promise<void>((resolve) => {
      setActiveColor(colorIndex);
      playTone(COLORS[colorIndex].freq);
      setTimeout(() => {
        setActiveColor(null);
        setTimeout(resolve, 200);
      }, 400);
    });
  }, [playTone]);

  const showSequence = useCallback(async (seq: number[]) => {
    setIsShowingSequence(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    for (const colorIndex of seq) {
      await flashColor(colorIndex);
    }
    
    setIsShowingSequence(false);
  }, [flashColor]);

  const startGame = () => {
    const firstColor = Math.floor(Math.random() * 4);
    setSequence([firstColor]);
    setPlayerSequence([]);
    setRound(1);
    setIsPlaying(true);
    setIsGameOver(false);
    setHighestRound(0);
    
    setTimeout(() => showSequence([firstColor]), 500);
  };

  const addToSequence = useCallback(() => {
    const newColor = Math.floor(Math.random() * 4);
    const newSequence = [...sequence, newColor];
    setSequence(newSequence);
    setPlayerSequence([]);
    setRound(r => r + 1);
    
    setTimeout(() => showSequence(newSequence), 1000);
  }, [sequence, showSequence]);

  const handleColorClick = async (colorIndex: number) => {
    if (isShowingSequence || !isPlaying) return;

    await flashColor(colorIndex);
    const newPlayerSequence = [...playerSequence, colorIndex];
    setPlayerSequence(newPlayerSequence);

    const currentIndex = newPlayerSequence.length - 1;
    
    if (newPlayerSequence[currentIndex] !== sequence[currentIndex]) {
      // Wrong!
      setIsGameOver(true);
      setIsPlaying(false);
      setHighestRound(round);
      playCelebration();
      return;
    }

    if (newPlayerSequence.length === sequence.length) {
      // Completed round!
      playCorrect();
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      
      setTimeout(() => {
        addToSequence();
      }, 1000);
    }
  };

  const getScore = () => {
    const completedRounds = isGameOver ? round - 1 : round;
    return completedRounds * 100 + (completedRounds * 50);
  };

  const saveScore = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để lưu điểm");
      return;
    }

    try {
      const { error } = await supabase.from("game_scores").insert({
        user_id: user.id,
        game_type: "simon-says",
        score: getScore(),
      });

      if (error) throw error;
      toast.success("Đã lưu điểm!");
      onClose();
    } catch (error) {
      console.error("Error saving score:", error);
      toast.error("Không thể lưu điểm");
    }
  };

  if (isGameOver) {
    const completedRounds = round - 1;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="text-6xl mb-4">🎵💫</div>
        <h2 className="text-2xl font-bold mb-2">
          {completedRounds >= 10 ? "Trí nhớ siêu phàm!" : 
           completedRounds >= 5 ? "Tuyệt vời!" : "Cố gắng hơn nhé!"}
        </h2>
        <p className="text-muted-foreground mb-2">
          Hoàn thành: {completedRounds} vòng
        </p>
        <p className="text-3xl font-bold text-primary mb-6">{getScore()} điểm</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={startGame} variant="outline">Chơi lại</Button>
          <Button onClick={saveScore}>Lưu điểm</Button>
        </div>
      </motion.div>
    );
  }

  if (!isPlaying) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🎵</div>
        <h2 className="text-2xl font-bold mb-4">Simon Says</h2>
        <p className="text-muted-foreground mb-2">
          Ghi nhớ và lặp lại chuỗi màu sắc
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Mỗi vòng sẽ dài thêm 1 màu!
        </p>
        <Button onClick={startGame} size="lg">Bắt đầu</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          Vòng: {round}
        </span>
        <span className="text-lg font-bold text-primary">{getScore()} điểm</span>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        {isShowingSequence ? "Hãy ghi nhớ..." : `Lặp lại chuỗi (${playerSequence.length}/${sequence.length})`}
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
        {COLORS.map((color, index) => (
          <motion.button
            key={color.name}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleColorClick(index)}
            disabled={isShowingSequence}
            className={`aspect-square rounded-2xl transition-all duration-100 ${
              activeColor === index ? color.active : color.bg
            } ${
              activeColor === index ? "scale-105 shadow-lg" : ""
            } ${
              isShowingSequence ? "cursor-not-allowed" : "cursor-pointer hover:opacity-90"
            }`}
          />
        ))}
      </div>

      <div className="flex justify-center gap-1">
        {sequence.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              i < playerSequence.length ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {isShowingSequence ? "Xem và ghi nhớ thứ tự màu!" : "Nhấn theo đúng thứ tự!"}
      </p>
    </div>
  );
}
