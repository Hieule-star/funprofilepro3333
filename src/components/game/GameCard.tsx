import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

interface GameCardProps {
  game: any;
  onPlay: () => void;
}

export default function GameCard({ game, onPlay }: GameCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="text-center">
          <div className="text-5xl mb-4">{game.icon}</div>
          <h3 className="text-xl font-bold">{game.name}</h3>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < game.difficulty
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-muted-foreground"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {game.description}
          </p>
        </CardContent>

        <CardFooter>
          <Button onClick={onPlay} className="w-full">
            Chơi
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
