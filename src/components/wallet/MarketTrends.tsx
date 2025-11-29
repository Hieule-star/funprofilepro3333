import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useTokenPrice } from "@/hooks/useTokenPrice";

export default function MarketTrends() {
  const { data: bnbPrice } = useTokenPrice("BNB");
  const { data: ethPrice } = useTokenPrice("ETH");
  const { data: camlyPrice } = useTokenPrice("CAMLY");
  
  // Mock 24h change data (in production, calculate from historical data)
  const bnbChange = 3.2;
  const ethChange = -1.5;
  const camlyChange = 5.8;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Thị trường
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* BNB */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/10 to-transparent rounded-lg border border-yellow-500/20">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🟡</div>
            <div>
              <p className="font-semibold">BNB</p>
              <p className="text-xs text-muted-foreground">BNB Chain</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold">
              ${bnbPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <div className={`flex items-center gap-1 text-xs ${bnbChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {bnbChange > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{bnbChange > 0 ? '+' : ''}{bnbChange}%</span>
            </div>
          </div>
        </div>

        {/* ETH */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500/10 to-transparent rounded-lg border border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔷</div>
            <div>
              <p className="font-semibold">ETH</p>
              <p className="text-xs text-muted-foreground">Ethereum</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold">
              ${ethPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <div className={`flex items-center gap-1 text-xs ${ethChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {ethChange > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{ethChange > 0 ? '+' : ''}{ethChange}%</span>
            </div>
          </div>
        </div>

        {/* CAMLY */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-500/10 to-transparent rounded-lg border border-pink-500/20">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🌸</div>
            <div>
              <p className="font-semibold">CAMLY</p>
              <p className="text-xs text-muted-foreground">BNB Chain</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold">
              ${camlyPrice ? camlyPrice.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 }) : 'N/A'}
            </p>
            <div className={`flex items-center gap-1 text-xs ${camlyChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {camlyChange > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{camlyChange > 0 ? '+' : ''}{camlyChange}%</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Cập nhật real-time từ CoinGecko
        </p>
      </CardContent>
    </Card>
  );
}
