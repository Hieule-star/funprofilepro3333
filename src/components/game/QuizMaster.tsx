import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useGameSounds } from "@/hooks/useGameSounds";

interface QuizMasterProps {
  onClose: () => void;
}

interface Question {
  question: string;
  options: string[];
  correct: number;
  category: string;
  explanation: string;
}

const QUESTIONS: Question[] = [
  { question: "Thủ đô của Nhật Bản là gì?", options: ["Seoul", "Tokyo", "Bắc Kinh", "Bangkok"], correct: 1, category: "🌍 Địa lý", explanation: "Tokyo là thủ đô và thành phố lớn nhất của Nhật Bản." },
  { question: "Năm nào Việt Nam giành độc lập?", options: ["1944", "1945", "1946", "1954"], correct: 1, category: "📚 Lịch sử", explanation: "Việt Nam tuyên bố độc lập vào ngày 2/9/1945." },
  { question: "H2O là công thức hóa học của gì?", options: ["Muối", "Nước", "Đường", "Oxy"], correct: 1, category: "🔬 Khoa học", explanation: "H2O gồm 2 nguyên tử Hydro và 1 nguyên tử Oxy, tạo thành nước." },
  { question: "Ai là tác giả của Truyện Kiều?", options: ["Nguyễn Trãi", "Nguyễn Du", "Hồ Xuân Hương", "Nguyễn Bỉnh Khiêm"], correct: 1, category: "📖 Văn học", explanation: "Truyện Kiều do Đại thi hào Nguyễn Du sáng tác." },
  { question: "Hành tinh nào lớn nhất trong Hệ Mặt Trời?", options: ["Trái Đất", "Sao Hỏa", "Sao Mộc", "Sao Thổ"], correct: 2, category: "🔬 Khoa học", explanation: "Sao Mộc (Jupiter) là hành tinh lớn nhất với đường kính gấp 11 lần Trái Đất." },
  { question: "Đồng bằng sông Cửu Long còn được gọi là gì?", options: ["Đồng bằng Bắc Bộ", "Miền Tây", "Tây Nguyên", "Đông Nam Bộ"], correct: 1, category: "🌍 Địa lý", explanation: "Đồng bằng sông Cửu Long thường được gọi là Miền Tây hoặc Đồng bằng Miền Tây." },
  { question: "1 thế kỷ bằng bao nhiêu năm?", options: ["10 năm", "50 năm", "100 năm", "1000 năm"], correct: 2, category: "📚 Kiến thức", explanation: "1 thế kỷ = 100 năm, 1 thiên niên kỷ = 1000 năm." },
  { question: "Con vật nào là biểu tượng của Việt Nam?", options: ["Hổ", "Rồng", "Voi", "Trâu"], correct: 1, category: "🎭 Văn hóa", explanation: "Rồng là biểu tượng thiêng liêng của Việt Nam, tượng trưng cho quyền lực và may mắn." },
  { question: "Ai phát minh ra bóng đèn điện?", options: ["Albert Einstein", "Thomas Edison", "Nikola Tesla", "Isaac Newton"], correct: 1, category: "🔬 Khoa học", explanation: "Thomas Edison được công nhận là người phát minh ra bóng đèn điện năm 1879." },
  { question: "Quốc gia nào có dân số đông nhất thế giới?", options: ["Mỹ", "Ấn Độ", "Trung Quốc", "Indonesia"], correct: 1, category: "🌍 Địa lý", explanation: "Ấn Độ vượt qua Trung Quốc trở thành quốc gia đông dân nhất năm 2023." },
  { question: "Loại khí nào cần thiết cho sự sống?", options: ["CO2", "N2", "O2", "H2"], correct: 2, category: "🔬 Khoa học", explanation: "Oxy (O2) là khí cần thiết cho hô hấp của con người và động vật." },
  { question: "World Cup bóng đá tổ chức mấy năm một lần?", options: ["2 năm", "3 năm", "4 năm", "5 năm"], correct: 2, category: "⚽ Thể thao", explanation: "FIFA World Cup được tổ chức 4 năm một lần kể từ 1930." },
  { question: "Đỉnh núi cao nhất thế giới là gì?", options: ["K2", "Everest", "Kilimanjaro", "Mont Blanc"], correct: 1, category: "🌍 Địa lý", explanation: "Everest cao 8,849m, nằm trên dãy Himalaya giữa Nepal và Tây Tạng." },
  { question: "Nguyên tố hóa học nào có ký hiệu Au?", options: ["Bạc", "Vàng", "Đồng", "Sắt"], correct: 1, category: "🔬 Khoa học", explanation: "Au là ký hiệu của Vàng (Aurum trong tiếng Latin)." },
  { question: "Ai là người đầu tiên đặt chân lên Mặt Trăng?", options: ["Yuri Gagarin", "Neil Armstrong", "Buzz Aldrin", "John Glenn"], correct: 1, category: "🔬 Khoa học", explanation: "Neil Armstrong đặt chân lên Mặt Trăng ngày 20/7/1969 trong sứ mệnh Apollo 11." },
];

export default function QuizMaster({ onClose }: QuizMasterProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    startGame();
  }, []);

  const startGame = () => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
    setQuestions(shuffled);
    setCurrentQuestion(0);
    setScore(0);
    setCorrectCount(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setIsComplete(false);
    setTimeLeft(15);
  };

  useEffect(() => {
    if (!questions.length || showResult || isComplete) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeout();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [questions.length, showResult, isComplete, currentQuestion]);

  const handleTimeout = () => {
    setShowResult(true);
    setTimeout(() => nextQuestion(), 2000);
  };

  const handleAnswer = (index: number) => {
    if (showResult) return;

    setSelectedAnswer(index);
    setShowResult(true);

    const isCorrect = index === questions[currentQuestion].correct;
    if (isCorrect) {
      playCorrect();
      const timeBonus = Math.floor(timeLeft * 5);
      setScore((prev) => prev + 100 + timeBonus);
      setCorrectCount((prev) => prev + 1);
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    }

    setTimeout(() => nextQuestion(), 2500);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setTimeLeft(15);
    } else {
      setIsComplete(true);
      playCelebration();
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
        game_type: "quiz-master",
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
        <div className="text-6xl mb-4">🧠🎉</div>
        <h2 className="text-2xl font-bold mb-2">
          {correctCount >= 8 ? "Xuất sắc!" : correctCount >= 5 ? "Tốt lắm!" : "Cố gắng hơn nhé!"}
        </h2>
        <p className="text-muted-foreground mb-2">
          Trả lời đúng: {correctCount}/10 câu
        </p>
        <p className="text-3xl font-bold text-primary mb-6">{score} điểm</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={startGame} variant="outline">Chơi lại</Button>
          <Button onClick={saveScore}>Lưu điểm & Thoát</Button>
        </div>
      </motion.div>
    );
  }

  const q = questions[currentQuestion];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          Câu {currentQuestion + 1}/{questions.length}
        </span>
        <span className="text-sm font-medium text-primary">{score} điểm</span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{q.category}</span>
          <span className={timeLeft <= 5 ? "text-red-500 font-bold" : ""}>⏱️ {timeLeft}s</span>
        </div>
        <Progress value={(timeLeft / 15) * 100} className="h-2" />
      </div>

      <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5">
        <motion.p
          key={currentQuestion}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-medium text-center"
        >
          {q.question}
        </motion.p>
      </Card>

      <div className="grid grid-cols-1 gap-2">
        <AnimatePresence>
          {q.options.map((option, index) => {
            const isCorrect = index === q.correct;
            const isSelected = index === selectedAnswer;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
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
                  className={`w-full justify-start text-left h-auto py-3 ${
                    showResult && isCorrect ? "bg-green-500 hover:bg-green-500" : ""
                  }`}
                  onClick={() => handleAnswer(index)}
                  disabled={showResult}
                >
                  <span className="font-bold mr-2">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {showResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg"
        >
          💡 {q.explanation}
        </motion.div>
      )}
    </div>
  );
}
