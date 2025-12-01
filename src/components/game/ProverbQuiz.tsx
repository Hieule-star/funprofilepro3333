import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGameSounds } from "@/hooks/useGameSounds";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface ProverbQuizProps {
  onClose: () => void;
}

interface Proverb {
  incomplete: string;
  options: string[];
  correct: number;
  full: string;
  meaning: string;
}

const PROVERBS: Proverb[] = [
  {
    incomplete: "Có công mài sắt, có ngày...",
    options: ["nên kim", "thành công", "giàu có", "hạnh phúc"],
    correct: 0,
    full: "Có công mài sắt, có ngày nên kim",
    meaning: "Kiên trì thì sẽ thành công",
  },
  {
    incomplete: "Ăn quả nhớ kẻ...",
    options: ["trồng cây", "làm vườn", "tưới nước", "chăm sóc"],
    correct: 0,
    full: "Ăn quả nhớ kẻ trồng cây",
    meaning: "Phải nhớ ơn người đã giúp đỡ mình",
  },
  {
    incomplete: "Đi một ngày đàng, học một...",
    options: ["sàng khôn", "điều hay", "bài học", "kinh nghiệm"],
    correct: 0,
    full: "Đi một ngày đàng, học một sàng khôn",
    meaning: "Đi nhiều nơi sẽ học được nhiều điều",
  },
  {
    incomplete: "Uống nước nhớ...",
    options: ["nguồn", "suối", "sông", "biển"],
    correct: 0,
    full: "Uống nước nhớ nguồn",
    meaning: "Phải nhớ ơn cội nguồn",
  },
  {
    incomplete: "Một cây làm chẳng nên...",
    options: ["non", "rừng", "vườn", "bóng"],
    correct: 0,
    full: "Một cây làm chẳng nên non",
    meaning: "Cần đoàn kết để làm việc lớn",
  },
  {
    incomplete: "Gần mực thì đen, gần đèn thì...",
    options: ["sáng", "rạng", "soi", "chiếu"],
    correct: 0,
    full: "Gần mực thì đen, gần đèn thì sáng",
    meaning: "Môi trường ảnh hưởng đến con người",
  },
  {
    incomplete: "Lá lành đùm...",
    options: ["lá rách", "lá xanh", "lá vàng", "lá non"],
    correct: 0,
    full: "Lá lành đùm lá rách",
    meaning: "Người khá giả nên giúp đỡ người khó khăn",
  },
  {
    incomplete: "Học ăn, học nói, học gói, học...",
    options: ["mở", "đóng", "cất", "giữ"],
    correct: 0,
    full: "Học ăn, học nói, học gói, học mở",
    meaning: "Cần học hỏi mọi điều trong cuộc sống",
  },
  {
    incomplete: "Thương người như thể...",
    options: ["thương thân", "thương mình", "thương ta", "yêu thân"],
    correct: 0,
    full: "Thương người như thể thương thân",
    meaning: "Yêu thương người khác như chính mình",
  },
  {
    incomplete: "Đói cho sạch, rách cho...",
    options: ["thơm", "lành", "đẹp", "mới"],
    correct: 0,
    full: "Đói cho sạch, rách cho thơm",
    meaning: "Dù nghèo khổ vẫn giữ phẩm giá",
  },
  {
    incomplete: "Tốt gỗ hơn tốt...",
    options: ["nước sơn", "màu sơn", "lớp sơn", "vẻ ngoài"],
    correct: 0,
    full: "Tốt gỗ hơn tốt nước sơn",
    meaning: "Nội dung quan trọng hơn hình thức",
  },
  {
    incomplete: "Có chí thì...",
    options: ["nên", "được", "làm", "thành"],
    correct: 0,
    full: "Có chí thì nên",
    meaning: "Có ý chí quyết tâm sẽ thành công",
  },
];

export default function ProverbQuiz({ onClose }: ProverbQuizProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  const [questions, setQuestions] = useState<Proverb[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const startGame = () => {
    const shuffled = [...PROVERBS].sort(() => Math.random() - 0.5).slice(0, 10);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setIsComplete(false);
    setGameStarted(true);
  };

  const handleAnswer = (index: number) => {
    if (showResult) return;

    setSelectedAnswer(index);
    setShowResult(true);

    if (index === questions[currentIndex].correct) {
      setScore((s) => s + 100);
      playCorrect();
      confetti({ particleCount: 30, spread: 40, origin: { y: 0.7 } });
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsComplete(true);
      playCelebration();
      confetti({ particleCount: 150, spread: 80 });
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
        game_type: "proverb-quiz",
        score: score,
      });

      if (error) throw error;
      toast.success(`Đã lưu ${score} điểm!`);
      onClose();
    } catch (error) {
      toast.error("Không thể lưu điểm");
    }
  };

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">📜 Đoán Thành Ngữ</h3>
          <p className="text-muted-foreground text-lg">Hoàn thành câu thành ngữ Việt Nam</p>
          <p className="text-sm text-muted-foreground mt-2">10 câu hỏi về kho tàng văn hóa dân gian</p>
        </div>

        <div className="text-center bg-muted p-4 rounded-lg max-w-sm">
          <p className="text-lg font-medium mb-2">💡 Mẹo nhỏ:</p>
          <p className="text-muted-foreground">Đọc kỹ câu và nhớ lại các câu thành ngữ quen thuộc</p>
        </div>
        
        <Button onClick={startGame} size="lg" className="text-lg px-8 py-6">
          🎮 Bắt đầu chơi
        </Button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-4 p-6"
      >
        <div className="text-6xl">🎓</div>
        <h3 className="text-2xl font-bold text-primary">
          {score >= 800 ? "Xuất sắc!" : score >= 500 ? "Tốt lắm!" : "Cố gắng hơn nhé!"}
        </h3>
        <p className="text-xl">Điểm: {score}/1000</p>
        <p className="text-muted-foreground">
          Đúng {score / 100}/{questions.length} câu
        </p>
        <div className="flex gap-3">
          <Button onClick={startGame} variant="outline" size="lg">
            Chơi lại
          </Button>
          <Button onClick={saveScore} size="lg">
            Lưu điểm & Thoát
          </Button>
        </div>
      </motion.div>
    );
  }

  const current = questions[currentIndex];

  return (
    <div className="flex flex-col items-center gap-4 p-2">
      <div className="flex justify-between w-full px-2">
        <span className="text-lg font-medium">
          Câu {currentIndex + 1}/{questions.length}
        </span>
        <span className="text-lg font-medium text-primary">Điểm: {score}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full"
        >
          <div className="bg-muted p-4 rounded-xl mb-4">
            <p className="text-xl font-medium text-center leading-relaxed">
              "{current.incomplete}"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {current.options.map((option, index) => (
              <Button
                key={index}
                onClick={() => handleAnswer(index)}
                variant={
                  showResult
                    ? index === current.correct
                      ? "default"
                      : selectedAnswer === index
                      ? "destructive"
                      : "outline"
                    : "outline"
                }
                className={`
                  text-lg py-6 h-auto
                  ${showResult && index === current.correct ? "bg-green-500 hover:bg-green-600" : ""}
                `}
                disabled={showResult}
              >
                {option}
              </Button>
            ))}
          </div>

          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-muted rounded-xl"
            >
              <p className="font-medium text-primary mb-1">✨ {current.full}</p>
              <p className="text-muted-foreground text-sm">📖 {current.meaning}</p>
              <Button onClick={nextQuestion} className="w-full mt-3" size="lg">
                {currentIndex < questions.length - 1 ? "Câu tiếp theo →" : "Xem kết quả"}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
