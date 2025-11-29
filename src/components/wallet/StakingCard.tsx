import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function StakingCard() {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          DeFi Staking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-6 w-6 text-green-500" />
            <h3 className="text-3xl font-bold text-green-500">12.5%</h3>
          </div>
          <p className="text-sm text-muted-foreground">APY dự kiến</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
            <span className="text-sm">BNB Staking</span>
            <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400">
              Hot
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
            <span className="text-sm">ETH Staking</span>
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-400">
              New
            </Badge>
          </div>
        </div>

        <Button variant="outline" disabled className="w-full gap-2">
          <Coins className="h-4 w-4" />
          Coming Soon
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Stake token để nhận thưởng hàng ngày
        </p>
      </CardContent>
    </Card>
  );
}
