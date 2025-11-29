import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import WalletHeader from "@/components/wallet/WalletHeader";
import QuickActions from "@/components/wallet/QuickActions";
import TokenList from "@/components/wallet/TokenList";
import TransactionList from "@/components/wallet/TransactionList";
import PortfolioOverview from "@/components/wallet/PortfolioOverview";
import MarketTrends from "@/components/wallet/MarketTrends";
import NFTSection from "@/components/wallet/NFTSection";
import StakingCard from "@/components/wallet/StakingCard";
import SecurityTips from "@/components/wallet/SecurityTips";
import TokenWatchlist from "@/components/wallet/TokenWatchlist";

export default function Wallet() {
  const achievements = [
    { title: "Early Adopter", desc: "Tham gia từ đầu", reward: 500 },
    { title: "Active Member", desc: "Đăng 10 bài viết", reward: 200 },
    { title: "Social Butterfly", desc: "Có 100 bạn bè", reward: 300 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Wallet Header with Balance */}
            <WalletHeader />

            {/* Quick Actions */}
            <QuickActions />

            {/* Portfolio Overview */}
            <PortfolioOverview />

            {/* Token List */}
            <TokenList />

            {/* NFT Section */}
            <NFTSection />

            {/* Transaction History */}
            <TransactionList />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Market Trends */}
            <MarketTrends />

            {/* Token Watchlist */}
            <TokenWatchlist />

            {/* Staking Card */}
            <StakingCard />

            {/* Achievements */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-warning" />
                  Thành tích
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {achievements.map((achievement, index) => (
                  <Card key={index} className="border-primary/10">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{achievement.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {achievement.desc}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          +{achievement.reward}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            {/* Security Tips */}
            <SecurityTips />

            {/* How to use */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardHeader>
                <CardTitle className="text-lg">Hướng dẫn sử dụng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Kết nối ví MetaMask hoặc Trust Wallet</p>
                <p>• Chọn mạng BNB Chain hoặc Ethereum</p>
                <p>• Xem số dư và lịch sử giao dịch</p>
                <p>• Quản lý tài sản crypto của bạn</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
