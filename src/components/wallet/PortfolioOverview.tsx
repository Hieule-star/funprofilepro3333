import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useBalance } from "wagmi";
import { useTokenPrice } from "@/hooks/useTokenPrice";

export default function PortfolioOverview() {
  const { isConnected, address, chainId } = useWallet();
  
  const { data: nativeBalance } = useBalance({
    address: address as `0x${string}`,
  });

  const nativeSymbol = chainId === 56 ? "BNB" : "ETH";
  const { data: nativePrice } = useTokenPrice(nativeSymbol);
  
  const balanceNum = nativeBalance 
    ? Number(nativeBalance.value) / Math.pow(10, nativeBalance.decimals)
    : 0;
  
  const usdValue = nativePrice && balanceNum ? balanceNum * nativePrice : 0;
  
  // Mock data for 24h change (in production, calculate from price history)
  const change24h = 2.45;
  const isPositive = change24h > 0;

  if (!isConnected) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          Tổng quan Portfolio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Tổng giá trị</p>
            <h3 className="text-3xl font-bold">
              ${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )}
            <span className="text-lg font-semibold">
              {isPositive ? '+' : ''}{change24h}%
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Phân bổ tài sản</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary"></div>
                <span className="text-sm font-medium">{nativeSymbol}</span>
              </div>
              <span className="text-sm font-semibold">100%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Số dư</p>
            <p className="text-sm font-semibold">
              {balanceNum.toFixed(4)} {nativeSymbol}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Giá hiện tại</p>
            <p className="text-sm font-semibold">
              ${nativePrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
