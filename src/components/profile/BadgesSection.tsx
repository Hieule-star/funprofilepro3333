import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Award, 
  Trophy, 
  Star, 
  Zap, 
  Heart, 
  MessageCircle, 
  Users, 
  Gamepad2,
  Calendar,
  TrendingUp,
  Shield,
  Crown
} from "lucide-react";

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  achieved_at?: string;
}

interface BadgesSectionProps {
  badges: BadgeData[];
  achievements?: any[];
}

const BADGE_ICONS: Record<string, any> = {
  trophy: Trophy,
  star: Star,
  zap: Zap,
  heart: Heart,
  message: MessageCircle,
  users: Users,
  game: Gamepad2,
  calendar: Calendar,
  trending: TrendingUp,
  shield: Shield,
  crown: Crown,
  award: Award,
};

const DEFAULT_BADGES: BadgeData[] = [
  { id: "member", name: "Thành viên", description: "Đã đăng ký tài khoản", icon: "shield" },
  { id: "first_post", name: "Bài viết đầu tiên", description: "Đăng bài viết đầu tiên", icon: "trending" },
  { id: "social_butterfly", name: "Hòa đồng", description: "Có 10 bạn bè", icon: "users" },
  { id: "popular", name: "Được yêu thích", description: "Nhận 100 lượt thích", icon: "heart" },
  { id: "gamer", name: "Game thủ", description: "Chơi 10 trận game", icon: "game" },
  { id: "streak_master", name: "Check-in Master", description: "Check-in 30 ngày liên tiếp", icon: "calendar" },
];

export function BadgesSection({ badges = [], achievements = [] }: BadgesSectionProps) {
  // Combine custom badges with default ones based on achievements
  const allBadges = badges.length > 0 ? badges : DEFAULT_BADGES;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Huy hiệu & Thành tựu
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allBadges.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {allBadges.map((badge) => {
              const IconComponent = BADGE_ICONS[badge.icon] || Award;
              const isAchieved = badge.achieved_at || achievements.some(a => a.achievement_type === badge.id);
              
              return (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                    isAchieved
                      ? "bg-primary/5 border-primary/30"
                      : "bg-muted/30 border-muted opacity-50"
                  }`}
                >
                  <div className={`p-3 rounded-full ${isAchieved ? "bg-primary/20" : "bg-muted"}`}>
                    <IconComponent className={`h-6 w-6 ${isAchieved ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                  </div>
                  {isAchieved && (
                    <Badge variant="secondary" className="text-xs">
                      Đạt được
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Chưa có huy hiệu nào</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
