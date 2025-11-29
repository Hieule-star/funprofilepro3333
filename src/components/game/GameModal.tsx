import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PuzzleSlider from "./PuzzleSlider";
import MemoryGame from "./MemoryGame";
import TicTacToe from "./TicTacToe";

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
