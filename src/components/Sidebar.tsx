import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sparkles, Users, CheckCircle2 } from "lucide-react";

export default function Sidebar() {
  const trendingTopics = [
    { tag: "#CryptoCommunity", posts: 245 },
    { tag: "#Blockchain", posts: 189 },
    { tag: "#Web3", posts: 156 },
    { tag: "#NFT", posts: 134 },
    { tag: "#DeFi", posts: 98 },
  ];

  const suggestedFriends = [
    { name: "Minh Anh", avatar: "MA", mutual: 12 },
    { name: "Hải Long", avatar: "HL", mutual: 8 },
    { name: "Thu Hằng", avatar: "TH", mutual: 5 },
  ];

  const features = [
    "Ví crypto tích hợp",
    "Kiếm Camly Coin mỗi ngày",
    "Kết nối cộng đồng Web3",
  ];

  return (
    <div className="space-y-4">
      {/* About Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Về Fun Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Mạng xã hội kết nối cộng đồng crypto và blockchain.
          </p>
          <p className="text-sm font-medium text-foreground">
            Chia sẻ, tương tác và kiếm thưởng mỗi ngày!
          </p>
          <div className="space-y-2 pt-2">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trending Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-warning" />
            Xu Hướng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trendingTopics.map((topic, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted"
            >
              <span className="font-medium text-primary">{topic.tag}</span>
              <Badge variant="secondary" className="text-xs">
                {topic.posts} bài viết
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Suggested Friends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-info" />
            Gợi Ý Kết Bạn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestedFriends.map((friend, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {friend.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{friend.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {friend.mutual} bạn chung
                  </p>
                </div>
              </div>
            </div>
          ))}
          <p className="pt-2 text-center text-sm text-muted-foreground">
            Đăng nhập để xem gợi ý kết bạn
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
