import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useGameSounds } from "@/hooks/useGameSounds";

interface SpeedTypingProps {
  onClose: () => void;
}

const WORDS = [
  "hello", "world", "computer", "keyboard", "programming", "developer",
  "javascript", "typescript", "react", "coding", "algorithm", "function",
  "variable", "component", "database", "internet", "software", "hardware",
  "network", "system", "application", "interface", "digital", "technology",
  "creative", "learning", "challenge", "success", "progress", "adventure"
];

export default function SpeedTyping({ onClose }: SpeedTypingProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  const [currentWord, setCurrentWord] = useState("");
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [correctWords, setCorrectWords] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getRandomWord = useCallback(() => {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
  }, []);

  const startGame = () => {
    setCurrentWord(getRandomWord());
    setInput("");
    setScore(0);
    setCorrectWords(0);
    setTotalWords(0);
    setTimeLeft(60);
    setIsPlaying(true);
    setIsComplete(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsPlaying(false);
          setIsComplete(true);
          playCelebration();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, playCelebration]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    if (value.trim().toLowerCase() === currentWord.toLowerCase()) {
      playCorrect();
      setCorrectWords((prev) => prev + 1);
      setTotalWords((prev) => prev + 1);
      setScore((prev) => prev + currentWord.length * 10);
      setCurrentWord(getRandomWord());
      setInput("");
      
      confetti({
        particleCount: 20,
        spread: 40,
        origin: { y: 0.7 },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " && input.trim() !== currentWord) {
      setTotalWords((prev) => prev + 1);
      setInput("");
    }
  };

  const accuracy = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 0;
  const wpm = Math.round((correctWords / 60) * (60 - timeLeft > 0 ? 60 : 1));

  const saveScore = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để lưu điểm");
      return;
    }

    try {
      const finalScore = score + (accuracy > 95 ? 200 : 0);
      const { error } = await supabase.from("game_scores").insert({
        user_id: user.id,
        game_type: "speed-typing",
        score: finalScore,
      });

      if (error) throw error;
      toast.success(`Đã lưu ${finalScore} điểm!`);
      onClose();
    } catch (error) {
      console.error("Error saving score:", error);
      toast.error("Không thể lưu điểm");
    }
  };

  const getCharColor = (index: number) => {
    if (index >= input.length) return "text-muted-foreground";
    return input[index].toLowerCase() === currentWord[index].toLowerCase()
      ? "text-green-500"
      : "text-red-500";
  };

  if (isComplete) {
    const finalScore = score + (accuracy > 95 ? 200 : 0);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="text-6xl mb-4">⌨️🎉</div>
        <h2 className="text-2xl font-bold mb-4">
          {wpm >= 40 ? "Tuyệt vời!" : wpm >= 25 ? "Tốt lắm!" : "Tiếp tục luyện tập!"}
        </h2>
        <div className="space-y-2 mb-6">
          <p className="text-lg">WPM: <span className="font-bold text-primary">{wpm}</span></p>
          <p className="text-lg">Độ chính xác: <span className="font-bold text-primary">{accuracy}%</span></p>
          <p className="text-lg">Từ đúng: <span className="font-bold">{correctWords}</span></p>
          {accuracy > 95 && <p className="text-sm text-green-500">+200 điểm bonus (accuracy &gt; 95%)</p>}
        </div>
        <p className="text-3xl font-bold text-primary mb-6">{finalScore} điểm</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={startGame} variant="outline">Chơi lại</Button>
          <Button onClick={saveScore}>Lưu điểm & Thoát</Button>
        </div>
      </motion.div>
    );
  }

  if (!isPlaying) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">⌨️</div>
        <h2 className="text-2xl font-bold mb-4">Speed Typing</h2>
        <p className="text-muted-foreground mb-6">
          Gõ các từ xuất hiện nhanh nhất có thể trong 60 giây!
        </p>
        <Button onClick={startGame} size="lg">Bắt đầu</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-lg font-medium">⏱️ {timeLeft}s</span>
        <span className="text-lg font-medium text-primary">{score} điểm</span>
      </div>

      <Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="text-4xl font-mono font-bold tracking-wider">
          {currentWord.split("").map((char, index) => (
            <span key={index} className={getCharColor(index)}>
              {char}
            </span>
          ))}
        </div>
      </Card>

      <Input
        ref={inputRef}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Gõ từ ở đây..."
        className="text-center text-xl font-mono"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Từ đúng: {correctWords}</span>
        <span>Độ chính xác: {accuracy}%</span>
      </div>
    </div>
  );
}
