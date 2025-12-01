import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface WordScrambleProps {
  onClose: () => void;
}

const WORDS = [
  { word: "MÈO", hint: "🐱", description: "Con vật kêu meo meo" },
  { word: "CHÓ", hint: "🐕", description: "Con vật trung thành" },
  { word: "HOA", hint: "🌸", description: "Mọc trong vườn, rất đẹp" },
  { word: "CÂY", hint: "🌳", description: "Có lá xanh, cho bóng mát" },
  { word: "NHÀ", hint: "🏠", description: "Nơi gia đình sống" },
  { word: "XE", hint: "🚗", description: "Phương tiện đi lại" },
  { word: "MẶT", hint: "😊", description: "Có mắt, mũi, miệng" },
  { word: "SAO", hint: "⭐", description: "Lấp lánh trên trời đêm" },
  { word: "MƯA", hint: "🌧️", description: "Nước rơi từ trời xuống" },
  { word: "GÀ", hint: "🐔", description: "Con vật kêu ò ó o" },
];

export default function WordScramble({ onClose }: WordScrambleProps) {
  const { user } = useAuth();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [gameWords, setGameWords] = useState<typeof WORDS>([]);

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const shuffledWords = [...WORDS].sort(() => Math.random() - 0.5).slice(0, 5);
    setGameWords(shuffledWords);
    setCurrentWordIndex(0);
    setScore(0);
    setIsComplete(false);
    setShowHint(false);
    setSelectedLetters([]);
    
    if (shuffledWords.length > 0) {
      shuffleWord(shuffledWords[0].word);
    }
  };

  const shuffleWord = (word: string) => {
    const letters = word.split("");
    const shuffled = [...letters].sort(() => Math.random() - 0.5);
    setShuffledLetters(shuffled);
    setSelectedLetters([]);
  };

  useEffect(() => {
    if (gameWords.length > 0 && currentWordIndex < gameWords.length) {
      shuffleWord(gameWords[currentWordIndex].word);
      setShowHint(false);
    }
  }, [currentWordIndex, gameWords]);

  const handleLetterClick = (index: number) => {
    if (selectedLetters.includes(index)) {
      setSelectedLetters(selectedLetters.filter((i) => i !== index));
    } else {
      const newSelected = [...selectedLetters, index];
      setSelectedLetters(newSelected);

      if (newSelected.length === shuffledLetters.length) {
        const formed = newSelected.map((i) => shuffledLetters[i]).join("");
        const isCorrect = formed === gameWords[currentWordIndex].word;

        if (isCorrect) {
          const points = showHint ? 50 : 100;
          setScore((prev) => prev + points);
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
          });

          setTimeout(() => {
            if (currentWordIndex < gameWords.length - 1) {
              setCurrentWordIndex((prev) => prev + 1);
            } else {
              setIsComplete(true);
            }
          }, 1000);
        } else {
          setTimeout(() => {
            setSelectedLetters([]);
          }, 500);
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
        game_type: "word-scramble",
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

  if (gameWords.length === 0) return null;

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="text-6xl mb-4">📝🌟</div>
        <h2 className="text-2xl font-bold mb-2">
          {score >= 400 ? "Xuất sắc!" : score >= 250 ? "Giỏi lắm!" : "Cố gắng hơn nhé!"}
        </h2>
        <p className="text-muted-foreground mb-2">
          Bạn đã hoàn thành 5 từ
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

  const currentWord = gameWords[currentWordIndex];
  const formedWord = selectedLetters.map((i) => shuffledLetters[i]).join("");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          Từ {currentWordIndex + 1}/5
        </span>
        <span className="text-sm font-medium text-primary">{score} điểm</span>
      </div>

      <Card className="p-6 text-center bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="text-5xl mb-4">{currentWord.hint}</div>
        {showHint && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground"
          >
            {currentWord.description}
          </motion.p>
        )}
      </Card>

      <div className="min-h-[60px] flex items-center justify-center gap-2 p-4 bg-muted rounded-lg">
        {formedWord ? (
          <motion.span
            key={formedWord}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-3xl font-bold tracking-widest"
          >
            {formedWord}
          </motion.span>
        ) : (
          <span className="text-muted-foreground">Chọn các chữ cái...</span>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <AnimatePresence>
          {shuffledLetters.map((letter, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Button
                variant={selectedLetters.includes(index) ? "default" : "outline"}
                className="w-12 h-12 text-xl font-bold"
                onClick={() => handleLetterClick(index)}
              >
                {letter}
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHint(true)}
          disabled={showHint}
        >
          💡 Gợi ý
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedLetters([])}
        >
          🔄 Xóa
        </Button>
      </div>
    </div>
  );
}
