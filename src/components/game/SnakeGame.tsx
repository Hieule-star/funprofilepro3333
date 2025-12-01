import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useGameSounds } from "@/hooks/useGameSounds";

interface SnakeGameProps {
  onClose: () => void;
}

type Position = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";

const GRID_SIZE = 15;
const INITIAL_SPEED = 200;

export default function SnakeGame({ onClose }: SnakeGameProps) {
  const { user } = useAuth();
  const { playCorrect, playCelebration } = useGameSounds();
  const [snake, setSnake] = useState<Position[]>([{ x: 7, y: 7 }]);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>("right");
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const directionRef = useRef(direction);

  const generateFood = useCallback((snakeBody: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snakeBody.some(s => s.x === newFood.x && s.y === newFood.y));
    return newFood;
  }, []);

  const startGame = () => {
    const initialSnake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setDirection("right");
    directionRef.current = "right";
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setIsPlaying(true);
    setIsGameOver(false);
  };

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const head = { ...prevSnake[0] };
      const dir = directionRef.current;

      switch (dir) {
        case "up": head.y -= 1; break;
        case "down": head.y += 1; break;
        case "left": head.x -= 1; break;
        case "right": head.x += 1; break;
      }

      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setIsPlaying(false);
        setIsGameOver(true);
        playCelebration();
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some(s => s.x === head.x && s.y === head.y)) {
        setIsPlaying(false);
        setIsGameOver(true);
        playCelebration();
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        playCorrect();
        setScore(prev => {
          const newScore = prev + 10;
          if (newScore % 50 === 0) {
            setSpeed(s => Math.max(s - 20, 80));
          }
          return newScore;
        });
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food, generateFood, playCorrect, playCelebration]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(moveSnake, speed);
    return () => clearInterval(interval);
  }, [isPlaying, speed, moveSnake]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;

      const keyMap: { [key: string]: Direction } = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };

      const newDir = keyMap[e.key];
      if (!newDir) return;

      const opposites: { [key in Direction]: Direction } = {
        up: "down",
        down: "up",
        left: "right",
        right: "left",
      };

      if (opposites[newDir] !== directionRef.current) {
        directionRef.current = newDir;
        setDirection(newDir);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying]);

  const handleDirectionButton = (dir: Direction) => {
    const opposites: { [key in Direction]: Direction } = {
      up: "down",
      down: "up",
      left: "right",
      right: "left",
    };

    if (opposites[dir] !== directionRef.current) {
      directionRef.current = dir;
      setDirection(dir);
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
        game_type: "snake-game",
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

  if (isGameOver) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="text-6xl mb-4">🐍💀</div>
        <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
        <p className="text-muted-foreground mb-2">Độ dài rắn: {snake.length}</p>
        <p className="text-3xl font-bold text-primary mb-6">{score} điểm</p>
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
        <div className="text-6xl mb-4">🐍</div>
        <h2 className="text-2xl font-bold mb-4">Snake Game</h2>
        <p className="text-muted-foreground mb-2">Điều khiển rắn ăn táo 🍎</p>
        <p className="text-sm text-muted-foreground mb-6">
          Dùng phím mũi tên hoặc WASD
        </p>
        <Button onClick={startGame} size="lg">Bắt đầu</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Độ dài: {snake.length}</span>
        <span className="text-lg font-bold text-primary">{score} điểm</span>
      </div>

      <div 
        className="grid bg-muted/30 rounded-lg overflow-hidden border-2 border-primary/20"
        style={{ 
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          aspectRatio: "1",
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
          const x = index % GRID_SIZE;
          const y = Math.floor(index / GRID_SIZE);
          const isSnakeHead = snake[0].x === x && snake[0].y === y;
          const isSnakeBody = snake.slice(1).some(s => s.x === x && s.y === y);
          const isFood = food.x === x && food.y === y;

          return (
            <div
              key={index}
              className={`aspect-square ${
                isSnakeHead
                  ? "bg-green-600 rounded-sm"
                  : isSnakeBody
                  ? "bg-green-500 rounded-sm"
                  : isFood
                  ? "flex items-center justify-center"
                  : ""
              }`}
            >
              {isFood && <span className="text-xs">🍎</span>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div />
        <Button variant="outline" size="sm" onClick={() => handleDirectionButton("up")}>↑</Button>
        <div />
        <Button variant="outline" size="sm" onClick={() => handleDirectionButton("left")}>←</Button>
        <Button variant="outline" size="sm" onClick={() => handleDirectionButton("down")}>↓</Button>
        <Button variant="outline" size="sm" onClick={() => handleDirectionButton("right")}>→</Button>
      </div>
    </div>
  );
}
