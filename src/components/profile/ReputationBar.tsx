import { Progress } from "@/components/ui/progress";
import { Shield, Star } from "lucide-react";

interface ReputationBarProps {
  score: number;
}

const LEVELS = [
  { min: 0, max: 499, level: 1, name: "Newbie", color: "text-muted-foreground" },
  { min: 500, max: 1999, level: 2, name: "Rising", color: "text-blue-500" },
  { min: 2000, max: 4999, level: 3, name: "Pro", color: "text-green-500" },
  { min: 5000, max: 9999, level: 4, name: "Expert", color: "text-purple-500" },
  { min: 10000, max: Infinity, level: 5, name: "Master", color: "text-yellow-500" },
];

export function ReputationBar({ score }: ReputationBarProps) {
  const currentLevel = LEVELS.find((l) => score >= l.min && score <= l.max) || LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.level === currentLevel.level + 1);

  const progressInLevel = nextLevel
    ? ((score - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
    : 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className={`h-5 w-5 ${currentLevel.color}`} />
          <span className="font-medium">Level {currentLevel.level}</span>
          <span className={`text-sm ${currentLevel.color}`}>{currentLevel.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="font-bold">{score.toLocaleString()}</span>
          <span className="text-muted-foreground text-sm">điểm</span>
        </div>
      </div>

      <Progress value={progressInLevel} className="h-2" />

      {nextLevel && (
        <p className="text-xs text-muted-foreground text-right">
          Còn {(nextLevel.min - score).toLocaleString()} điểm để lên Level {nextLevel.level}
        </p>
      )}
    </div>
  );
}
