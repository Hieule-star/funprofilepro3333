import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PuzzleSlider from "./PuzzleSlider";
import MemoryGame from "./MemoryGame";
import TicTacToe from "./TicTacToe";
import ColorMatch from "./ColorMatch";
import MathKids from "./MathKids";
import WordScramble from "./WordScramble";
import CatchStars from "./CatchStars";
import AnimalQuiz from "./AnimalQuiz";
import SpeedTyping from "./SpeedTyping";
import Game2048 from "./Game2048";
import SnakeGame from "./SnakeGame";
import QuizMaster from "./QuizMaster";
import ReactionTest from "./ReactionTest";
import SimonSays from "./SimonSays";
import Sudoku from "./Sudoku";
import SpotDifference from "./SpotDifference";
import JigsawPuzzle from "./JigsawPuzzle";
import ProverbQuiz from "./ProverbQuiz";
import Gomoku from "./Gomoku";
import NumberSort from "./NumberSort";

interface GameModalProps {
  gameId: string | null;
  onClose: () => void;
}

export default function GameModal({ gameId, onClose }: GameModalProps) {
  const renderGame = () => {
    switch (gameId) {
      case "puzzle-slider":
        return <PuzzleSlider onClose={onClose} />;
      case "memory-cards":
        return <MemoryGame onClose={onClose} />;
      case "tic-tac-toe":
        return <TicTacToe onClose={onClose} />;
      case "color-match":
        return <ColorMatch onClose={onClose} />;
      case "math-kids":
        return <MathKids onClose={onClose} />;
      case "word-scramble":
        return <WordScramble onClose={onClose} />;
      case "catch-stars":
        return <CatchStars onClose={onClose} />;
      case "animal-quiz":
        return <AnimalQuiz onClose={onClose} />;
      case "speed-typing":
        return <SpeedTyping onClose={onClose} />;
      case "game-2048":
        return <Game2048 onClose={onClose} />;
      case "snake-game":
        return <SnakeGame onClose={onClose} />;
      case "quiz-master":
        return <QuizMaster onClose={onClose} />;
      case "reaction-test":
        return <ReactionTest onClose={onClose} />;
      case "simon-says":
        return <SimonSays onClose={onClose} />;
      case "sudoku":
        return <Sudoku onClose={onClose} />;
      case "spot-difference":
        return <SpotDifference onClose={onClose} />;
      case "jigsaw-puzzle":
        return <JigsawPuzzle onClose={onClose} />;
      case "proverb-quiz":
        return <ProverbQuiz onClose={onClose} />;
      case "gomoku":
        return <Gomoku onClose={onClose} />;
      case "number-sort":
        return <NumberSort onClose={onClose} />;
      default:
        return null;
    }
  };

  const getGameTitle = () => {
    switch (gameId) {
      case "puzzle-slider":
        return "🧩 Puzzle Slider";
      case "memory-cards":
        return "🃏 Memory Cards";
      case "tic-tac-toe":
        return "🎯 Tic-Tac-Toe";
      case "color-match":
        return "🎨 Color Match";
      case "math-kids":
        return "🔢 Math Kids";
      case "word-scramble":
        return "📝 Word Scramble";
      case "catch-stars":
        return "⭐ Catch Stars";
      case "animal-quiz":
        return "🦁 Animal Quiz";
      case "speed-typing":
        return "⌨️ Speed Typing";
      case "game-2048":
        return "🔲 2048";
      case "snake-game":
        return "🐍 Snake Game";
      case "quiz-master":
        return "🧠 Quiz Master";
      case "reaction-test":
        return "⚡ Reaction Test";
      case "simon-says":
        return "🎵 Simon Says";
      case "sudoku":
        return "🔢 Sudoku";
      case "spot-difference":
        return "🔍 Tìm Điểm Khác";
      case "jigsaw-puzzle":
        return "🧩 Ghép Hình";
      case "proverb-quiz":
        return "📜 Đoán Thành Ngữ";
      case "gomoku":
        return "⭕ Cờ Caro";
      case "number-sort":
        return "🔢 Sắp Xếp Số";
      default:
        return "Game";
    }
  };

  return (
    <Dialog open={!!gameId} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getGameTitle()}</DialogTitle>
        </DialogHeader>
        {renderGame()}
      </DialogContent>
    </Dialog>
  );
}
