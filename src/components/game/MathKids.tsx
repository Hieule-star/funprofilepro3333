import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface MathKidsProps {
  onClose: () => void;
}

const EMOJIS = ["🐰", "🐱", "🐶", "🦊", "🐼", "🐨", "🐸", "🐵"];

interface Question {
  num1: number;
  num2: number;
  operator: "+" | "-";
  answer: number;
  options: number[];
  emoji: string;
}

export default function MathKids({ onClose }: MathKidsProps) {
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = () => {
    const newQuestions: Question[] = [];
    for (let i = 0; i < 10; i++) {
      const isAddition = Math.random() > 0.5;
      let num1: number, num2: number, answer: number;

      if (isAddition) {
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 + num2;
      } else {
        num1 = Math.floor(Math.random() * 15) + 5;
        num2 = Math.floor(Math.random() * num1);
        answer = num1 - num2;
      }

      const options = [answer];
      while (options.length < 4) {
        const wrongAnswer = answer + Math.floor(Math.random() * 5) - 2;
        if (wrongAnswer !== answer && wrongAnswer >= 0 && !options.includes(wrongAnswer)) {
          options.push(wrongAnswer);
        }
      }

      newQuestions.push({
        num1,
        num2,
        operator: isAddition ? "+" : "-",
        answer,
        options: options.sort(() => Math.random() - 0.5),
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      });
    }
    setQuestions(newQuestions);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setIsComplete(false);
  };

  const handleAnswer = (answer: number) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer === questions[currentQuestion].answer;
    if (isCorrect) {
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
        game_type: "math-kids",
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

  if (questions.length === 0) return null;

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="text-6xl mb-4">🔢🎉</div>
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
          <Button onClick={saveScore}>Lưu điểm & Thoát</Button>
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="text-4xl font-bold flex items-center justify-center gap-2">
            <span>{q.emoji}</span>
            <span>{q.num1}</span>
            <span className="text-primary">{q.operator}</span>
            <span>{q.emoji}</span>
            <span>{q.num2}</span>
            <span>=</span>
            <span className="text-primary">?</span>
          </div>
        </motion.div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence>
          {q.options.map((option, index) => {
            const isCorrect = option === q.answer;
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
                  className={`w-full h-16 text-2xl font-bold ${
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
        Chọn đáp án đúng nhé! 🧮
      </p>
    </div>
  );
}
