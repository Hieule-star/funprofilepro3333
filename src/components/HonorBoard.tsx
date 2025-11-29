import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Heart, Users, TrendingUp, Award } from "lucide-react";
import logo from "@/assets/logo.jpg";

export default function HonorBoard() {
  const stats = [
    { icon: TrendingUp, label: "POSTS", value: 0, color: "text-primary" },
    { icon: MessageSquare, label: "COMMENTS", value: 0, color: "text-info" },
    { icon: Heart, label: "REACTIONS", value: 0, color: "text-destructive" },
    { icon: Users, label: "FRIENDS", value: 0, color: "text-secondary" },
    { icon: Award, label: "TOTAL REWARD", value: 0, color: "text-warning" },
  ];

  return (
    <Card className="border-primary bg-gradient-to-br from-primary via-primary-light to-secondary shadow-glow">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-center gap-3">
          <img src={logo} alt="Fun Profile Web3" className="h-16 w-16 rounded-full object-cover border-4 border-primary-foreground shadow-lg" />
        </div>
        <CardTitle className="text-center text-2xl font-heading font-bold text-primary-foreground">
          HONOR BOARD
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="flex items-center justify-between rounded-xl border-2 border-primary-foreground/20 bg-primary-foreground/10 px-4 py-3 backdrop-blur-sm transition-all hover:border-primary-foreground/40"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary-foreground" />
                <span className="font-semibold text-primary-foreground">
                  {stat.label}
                </span>
              </div>
              <span className="text-xl font-bold text-primary-foreground">
                {stat.value}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
