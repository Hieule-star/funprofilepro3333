import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PuzzleSlider from "./PuzzleSlider";
import MemoryGame from "./MemoryGame";
import TicTacToe from "./TicTacToe";
import ColorMatch from "./ColorMatch";
import MathKids from "./MathKids";
import WordScramble from "./WordScramble";
import CatchStars from "./CatchStars";
import AnimalQuiz from "./AnimalQuiz";

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
