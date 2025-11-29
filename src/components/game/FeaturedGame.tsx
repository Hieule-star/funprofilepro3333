import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, Play } from "lucide-react";
import { motion } from "framer-motion";

interface FeaturedGameProps {
  game: any;
  onPlay: () => void;
}

export default function FeaturedGame({ game, onPlay }: FeaturedGameProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
        <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
          🔥 Nổi bật
        </div>

        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-6xl">{game.icon}</div>
            <div>
              <h2 className="text-3xl font-bold mb-2">{game.name}</h2>
              <div className="flex items-center gap-1">
                {Array.from({ length: game.difficulty }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
            </div>
          </div>

          <p className="text-lg text-muted-foreground mb-6">{game.description}</p>

          <Button onClick={onPlay} size="lg" className="gap-2">
            <Play className="h-5 w-5" />
            Chơi ngay
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
