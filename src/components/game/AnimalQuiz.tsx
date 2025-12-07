import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useGameSounds } from "@/hooks/useGameSounds";

interface AnimalQuizProps {
  onClose: () => void;
}

const ANIMALS = [
  { emoji: "🐕", name: "Chó", options: ["Chó", "Mèo", "Thỏ", "Gà"] },
  { emoji: "🐱", name: "Mèo", options: ["Chó", "Mèo", "Chuột", "Vịt"] },
  { emoji: "🐘", name: "Voi", options: ["Voi", "Hà mã", "Tê giác", "Hươu"] },
  { emoji: "🦁", name: "Sư tử", options: ["Hổ", "Sư tử", "Báo", "Gấu"] },
  { emoji: "🐰", name: "Thỏ", options: ["Chuột", "Sóc", "Thỏ", "Nhím"] },
  { emoji: "🐸", name: "Ếch", options: ["Ếch", "Cóc", "Rắn", "Thằn lằn"] },
  { emoji: "🦋", name: "Bướm", options: ["Ong", "Bướm", "Chuồn chuồn", "Ruồi"] },
  { emoji: "🐧", name: "Chim cánh cụt", options: ["Vịt", "Ngỗng", "Chim cánh cụt", "Cò"] },
  { emoji: "🦊", name: "Cáo", options: ["Chó sói", "Cáo", "Chó", "Gấu mèo"] },
  { emoji: "🐼", name: "Gấu trúc", options: ["Gấu", "Gấu trúc", "Koala", "Khỉ"] },
  { emoji: "🦒", name: "Hươu cao cổ", options: ["Ngựa vằn", "Hươu cao cổ", "Lạc đà", "Nai"] },
  { emoji: "🐬", name: "Cá heo", options: ["Cá mập", "Cá heo", "Cá voi", "Hải cẩu"] },
  { emoji: "🦜", name: "Vẹt", options: ["Vẹt", "Chim sẻ", "Quạ", "Bồ câu"] },
  { emoji: "🐢", name: "Rùa", options: ["Ốc sên", "Rùa", "Cua", "Tôm"] },
  { emoji: "🦉", name: "Cú", options: ["Đại bàng", "Cú", "Diều hâu", "Quạ"] },
];

interface Question {
  emoji: string;
  name: string;
  options: string[];
}

export default function AnimalQuiz({ onClose }: AnimalQuizProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = () => {
    const shuffled = [...ANIMALS].sort(() => Math.random() - 0.5).slice(0, 10);
    const questionsWithShuffledOptions = shuffled.map((q) => ({
      ...q,
      options: [...q.options].sort(() => Math.random() - 0.5),
    }));
    setQuestions(questionsWithShuffledOptions);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setIsComplete(false);
  };

  const handleAnswer = (answer: string) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer === questions[currentQuestion].name;
    if (isCorrect) {
      playCorrect();
      setScore((prev) => prev + 100);
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
      });
    }

    setTimeout(() => {
      if (currentQuestion < 9) {
        setCurrentQuestion((prev) => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setIsComplete(true);
        playCelebration();
      }
    }, 1500);
  };

  const saveScore = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để lưu điểm");
      return;
    }

    try {
      const { error } = await supabase.from("game_scores").insert({
        user_id: user.id,
        game_type: "animal-quiz",
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

  if (questions.length === 0) return null;

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="text-6xl mb-4">🦁🎉</div>
        <h2 className="text-2xl font-bold mb-2">
          {score >= 800 ? "Xuất sắc!" : score >= 500 ? "Giỏi lắm!" : "Cố gắng hơn nhé!"}
        </h2>
        <p className="text-muted-foreground mb-2">
          Bạn trả lời đúng {score / 100}/10 câu
        </p>
        <p className="text-3xl font-bold text-primary mb-6">{score} điểm</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={generateQuestions} variant="outline">
            Chơi lại
          </Button>
          <Button onClick={saveScore}>Lưu điểm</Button>
        </div>
      </motion.div>
    );
  }

  const q = questions[currentQuestion];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          Câu {currentQuestion + 1}/10
        </span>
        <span className="text-sm font-medium text-primary">{score} điểm</span>
      </div>

      <Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-primary/5">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="text-8xl">{q.emoji}</div>
          <p className="text-lg font-medium">Đây là con gì?</p>
        </motion.div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence>
          {q.options.map((option, index) => {
            const isCorrect = option === q.name;
            const isSelected = option === selectedAnswer;

            return (
              <motion.div
                key={option}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  variant={
                    showResult
                      ? isCorrect
                        ? "default"
                        : isSelected
                        ? "destructive"
                        : "outline"
                      : "outline"
                  }
                  className={`w-full h-14 text-base font-medium ${
                    showResult && isCorrect ? "bg-green-500 hover:bg-green-500" : ""
                  }`}
                  onClick={() => handleAnswer(option)}
                  disabled={showResult}
                >
                  {option}
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Nhận biết các con vật dễ thương! 🐾
      </p>
    </div>
  );
}
