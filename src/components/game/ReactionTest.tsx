import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useGameSounds } from "@/hooks/useGameSounds";

interface ReactionTestProps {
  onClose: () => void;
}

type GameState = "waiting" | "ready" | "go" | "result" | "early" | "complete";

export default function ReactionTest({ onClose }: ReactionTestProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  const [state, setState] = useState<GameState>("waiting");
  const [times, setTimes] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startRound = () => {
    setState("ready");
    const delay = 2000 + Math.random() * 3000; // 2-5 seconds
    
    timeoutRef.current = setTimeout(() => {
      setState("go");
      startTimeRef.current = Date.now();
    }, delay);
  };

  const handleClick = () => {
    if (state === "waiting") {
      startRound();
    } else if (state === "ready") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState("early");
    } else if (state === "go") {
      const reactionTime = Date.now() - startTimeRef.current;
      setCurrentTime(reactionTime);
      setTimes(prev => [...prev, reactionTime]);
      playCorrect();
      
      if (reactionTime < 250) {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      }
      
      setState("result");
    } else if (state === "result" || state === "early") {
      if (times.length >= 5) {
        setState("complete");
        playCelebration();
      } else {
        startRound();
      }
    }
  };

  const getAverageTime = () => {
    if (times.length === 0) return 0;
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  };

  const getScore = () => {
    const avg = getAverageTime();
    if (avg < 200) return 1000;
    if (avg < 250) return 800;
    if (avg < 300) return 600;
    if (avg < 400) return 400;
    return 200;
  };

  const getRank = () => {
    const avg = getAverageTime();
    if (avg < 200) return { text: "Xuất sắc! 🏆", color: "text-yellow-500" };
    if (avg < 250) return { text: "Tuyệt vời! 🌟", color: "text-green-500" };
    if (avg < 300) return { text: "Tốt! 👍", color: "text-blue-500" };
    if (avg < 400) return { text: "Khá! 💪", color: "text-orange-500" };
    return { text: "Cần cải thiện 🎯", color: "text-muted-foreground" };
  };

  const saveScore = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để lưu điểm");
      return;
    }

    try {
      const { error } = await supabase.from("game_scores").insert({
        user_id: user.id,
        game_type: "reaction-test",
        score: getScore(),
      });

      if (error) throw error;
      toast.success(`Đã lưu ${getScore()} điểm!`);
      onClose();
    } catch (error) {
      console.error("Error saving score:", error);
      toast.error("Không thể lưu điểm");
    }
  };

  const resetGame = () => {
    setTimes([]);
    setCurrentTime(0);
    setState("waiting");
  };

  if (state === "complete") {
    const rank = getRank();
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="text-6xl mb-4">⚡🎉</div>
        <h2 className={`text-2xl font-bold mb-2 ${rank.color}`}>{rank.text}</h2>
        <p className="text-muted-foreground mb-2">
          Thời gian phản xạ trung bình: <span className="font-bold">{getAverageTime()}ms</span>
        </p>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {times.map((time, i) => (
            <span key={i} className="text-sm bg-muted px-2 py-1 rounded">
              {i + 1}: {time}ms
            </span>
          ))}
        </div>
        <p className="text-3xl font-bold text-primary mb-6">{getScore()} điểm</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={resetGame} variant="outline">Chơi lại</Button>
          <Button onClick={saveScore}>Lưu điểm & Thoát</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          Lần thử: {times.length + (state === "result" || state === "early" ? 0 : 1)}/5
        </span>
        {times.length > 0 && (
          <span className="text-sm">TB: {getAverageTime()}ms</span>
        )}
      </div>

      <Card
        className={`h-64 flex items-center justify-center cursor-pointer transition-colors ${
          state === "waiting" ? "bg-blue-500" :
          state === "ready" ? "bg-red-500" :
          state === "go" ? "bg-green-500" :
          state === "early" ? "bg-yellow-500" :
          "bg-muted"
        }`}
        onClick={handleClick}
      >
        <motion.div
          key={state}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center text-white"
        >
          {state === "waiting" && (
            <>
              <div className="text-4xl mb-2">⚡</div>
              <p className="text-xl font-bold">Nhấn để bắt đầu</p>
            </>
          )}
          {state === "ready" && (
            <>
              <div className="text-4xl mb-2">🔴</div>
              <p className="text-xl font-bold">Chờ...</p>
              <p className="text-sm opacity-80">Đừng nhấn vội!</p>
            </>
          )}
          {state === "go" && (
            <>
              <div className="text-4xl mb-2">🟢</div>
              <p className="text-2xl font-bold">NHẤN NGAY!</p>
            </>
          )}
          {state === "early" && (
            <>
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-xl font-bold text-yellow-900">Quá sớm!</p>
              <p className="text-sm text-yellow-900">Nhấn để thử lại</p>
            </>
          )}
          {state === "result" && (
            <>
              <div className="text-4xl mb-2">⏱️</div>
              <p className="text-3xl font-bold text-green-900">{currentTime}ms</p>
              <p className="text-sm text-green-900">Nhấn để tiếp tục</p>
            </>
          )}
        </motion.div>
      </Card>

      {times.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {times.map((time, i) => (
            <span
              key={i}
              className={`text-sm px-2 py-1 rounded ${
                time < 250 ? "bg-green-500/20 text-green-600" :
                time < 350 ? "bg-yellow-500/20 text-yellow-600" :
                "bg-red-500/20 text-red-600"
              }`}
            >
              {time}ms
            </span>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Nhấn ngay khi màu chuyển sang xanh lá!
      </p>
    </div>
  );
}
