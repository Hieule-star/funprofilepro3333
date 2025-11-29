import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Trash2, TrendingUp, TrendingDown, Bell, BellOff } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAuth } from "@/contexts/AuthContext";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import AddToWatchlistModal from "./AddToWatchlistModal";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface WatchlistTokenItemProps {
  id: string;
  symbol: string;
  name: string | null;
  priceAlertUpper: number | null;
  priceAlertLower: number | null;
  onRemove: (id: string) => void;
}

function WatchlistTokenItem({
  id,
  symbol,
  name,
  priceAlertUpper,
  priceAlertLower,
  onRemove,
}: WatchlistTokenItemProps) {
  const { data: currentPrice } = useTokenPrice(symbol);
  const { toast } = useToast();

  // Check price alerts
  useEffect(() => {
    if (!currentPrice) return;

    if (priceAlertUpper && currentPrice > priceAlertUpper) {
      toast({
        title: `🔔 Cảnh báo giá ${symbol}`,
        description: `Giá ${symbol} đã vượt $${priceAlertUpper.toLocaleString()}. Giá hiện tại: $${currentPrice.toLocaleString()}`,
      });
    }

    if (priceAlertLower && currentPrice < priceAlertLower) {
      toast({
        title: `🔔 Cảnh báo giá ${symbol}`,
        description: `Giá ${symbol} đã giảm xuống dưới $${priceAlertLower.toLocaleString()}. Giá hiện tại: $${currentPrice.toLocaleString()}`,
      });
    }
  }, [currentPrice, priceAlertUpper, priceAlertLower, symbol, toast]);

  const hasAlerts = priceAlertUpper || priceAlertLower;

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{symbol}</p>
            {hasAlerts && (
              <Bell className="h-3 w-3 text-primary" />
            )}
          </div>
          {name && <p className="text-xs text-muted-foreground">{name}</p>}
          {hasAlerts && (
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              {priceAlertUpper && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span>&gt; ${priceAlertUpper.toLocaleString()}</span>
                </div>
              )}
              {priceAlertLower && (
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span>&lt; ${priceAlertLower.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="text-right flex items-center gap-2">
        {currentPrice ? (
          <p className="font-bold">
            ${currentPrice.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 8,
            })}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onRemove(id)}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function TokenWatchlist() {
  const { user } = useAuth();
  const { watchlist, isLoading, addToWatchlist, removeFromWatchlist } = useWatchlist(user?.id);

  if (!user) {
    return (
      <Card className="border-primary/20">
        <CardContent className="pt-6 text-center">
          <BellOff className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Đăng nhập để theo dõi token yêu thích
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Watchlist
          </CardTitle>
          <AddToWatchlistModal onAdd={addToWatchlist} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Đang tải...</p>
        ) : watchlist.length === 0 ? (
          <div className="text-center py-6">
            <Star className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Chưa có token nào trong watchlist
            </p>
            <p className="text-xs text-muted-foreground">
              Thêm token để theo dõi giá và nhận cảnh báo
            </p>
          </div>
        ) : (
          watchlist.map((item) => (
            <WatchlistTokenItem
              key={item.id}
              id={item.id}
              symbol={item.token_symbol}
              name={item.token_name}
              priceAlertUpper={item.price_alert_upper}
              priceAlertLower={item.price_alert_lower}
              onRemove={removeFromWatchlist}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
