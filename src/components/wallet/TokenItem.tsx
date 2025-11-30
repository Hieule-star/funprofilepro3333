import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TokenItemProps {
  icon?: string; // Emoji or image URL
  name: string;
  symbol: string;
  balance: string;
  usdValue?: number | null;
  isLoading?: boolean;
  logoUrl?: string | null;
}

export default function TokenItem({ icon, name, symbol, balance, usdValue, isLoading, logoUrl }: TokenItemProps) {
  const balanceNum = parseFloat(balance);
  const totalUsdValue = usdValue && !isNaN(balanceNum) ? balanceNum * usdValue : null;
  
  // Determine if icon is a URL or emoji
  const isImageUrl = logoUrl?.startsWith('http');
  const displayIcon = logoUrl && isImageUrl ? logoUrl : (icon || '🪙');
  
  if (isLoading) {
    return (
      <Card className="border-primary/10">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/10 hover:border-primary/30 transition-colors">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isImageUrl ? (
              <img 
                src={displayIcon} 
                alt={symbol}
                className="w-10 h-10 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : (
              <div className="text-3xl">{displayIcon}</div>
            )}
            {isImageUrl && (
              <div className="text-3xl hidden">🪙</div>
            )}
            <div>
              <h4 className="font-semibold">{name}</h4>
              <p className="text-sm text-muted-foreground">{symbol}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-lg">{balance}</p>
            <p className="text-xs text-muted-foreground">{symbol}</p>
            {usdValue !== null && usdValue !== undefined && (
              <div className="mt-1 space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  Giá: ${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </p>
                {totalUsdValue !== null && (
                  <p className="text-sm font-semibold text-primary">
                    ≈ ${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </p>
                )}
              </div>
            )}
            {(usdValue === null || usdValue === undefined) && !isLoading && (
              <p className="text-xs text-muted-foreground mt-1">
                Giá chưa có
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
