import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Coins, Search } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useState } from "react";
import TokenItem from "./TokenItem";
import AddTokenModal from "./AddTokenModal";
import AutoDetectModal from "./AutoDetectModal";
import { useBalance, useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { useTokenPrice, useTokenPriceByContract } from "@/hooks/useTokenPrice";
import { useAutoDetect } from "@/hooks/useAutoDetect";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBalance } from "@/lib/utils";

export default function TokenList() {
  const { isConnected, address, chainId, customTokens, refreshTokens } = useWallet();
  const [isAddTokenOpen, setIsAddTokenOpen] = useState(false);
  const [isAutoDetectOpen, setIsAutoDetectOpen] = useState(false);
  const [detectedTokens, setDetectedTokens] = useState<any[]>([]);
  const { detectTokens, isDetecting } = useAutoDetect();

  // Get native token balance
  const { data: nativeBalance } = useBalance({
    address: address as `0x${string}`,
  });

  // Get native token price
  const nativeSymbol = chainId === 56 ? "BNB" : "ETH";
  const { data: nativePrice } = useTokenPrice(nativeSymbol);

  const handleAutoDetect = async () => {
    if (!address || chainId !== 56) {
      toast.error("Tự động tìm kiếm chỉ hỗ trợ BNB Chain");
      return;
    }

    setIsAutoDetectOpen(true);
    setDetectedTokens([]);

    try {
      const tokens = await detectTokens(address, chainId);
      setDetectedTokens(tokens);
      
      if (tokens.length === 0) {
        toast.info("Không tìm thấy token nào được list trên CoinGecko");
      }
    } catch (error) {
      console.error('[TokenList] Auto-detect error:', error);
      toast.error("Không thể tìm kiếm tokens. Vui lòng thử lại.");
      setIsAutoDetectOpen(false);
    }
  };

  const handleAddSelectedTokens = async (selectedTokens: any[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Bạn cần đăng nhập để thêm token");
      return;
    }

    let successCount = 0;
    let duplicateCount = 0;

    for (const token of selectedTokens) {
      try {
        // Check if token already exists
        const { data: existing } = await supabase
          .from('custom_tokens')
          .select('id')
          .eq('user_id', user.id)
          .eq('contract_address', token.contract_address.toLowerCase())
          .single();

        if (existing) {
          duplicateCount++;
          continue;
        }

        // Add token to database
        const { error } = await supabase.from('custom_tokens').insert({
          user_id: user.id,
          contract_address: token.contract_address,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          logo_url: token.logo_url,
          chain_id: 56,
        });

        if (error) {
          console.error('[TokenList] Error adding token:', error);
        } else {
          successCount++;
        }
      } catch (error) {
        console.error('[TokenList] Error processing token:', error);
      }
    }

    if (successCount > 0) {
      toast.success(`Đã thêm ${successCount} token vào ví`);
      await refreshTokens();
    }

    if (duplicateCount > 0) {
      toast.info(`${duplicateCount} token đã tồn tại trong ví`);
    }

    setIsAutoDetectOpen(false);
    setDetectedTokens([]);
  };

  if (!isConnected) {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-warning" />
              Token Assets
            </CardTitle>
            <div className="flex gap-2">
              {chainId === 56 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAutoDetect}
                  className="gap-2"
                  disabled={isDetecting}
                >
                  <Search className="h-4 w-4" />
                  Tự động tìm
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddTokenOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Thêm Token
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Native Token */}
          <TokenItem
            icon={chainId === 56 ? "🟡" : "🔷"}
            name={chainId === 56 ? "BNB" : "Ethereum"}
            symbol={chainId === 56 ? "BNB" : "ETH"}
            balance={nativeBalance ? formatBalance(Number(nativeBalance.value) / Math.pow(10, nativeBalance.decimals)) : "0"}
            rawBalance={nativeBalance ? Number(nativeBalance.value) / Math.pow(10, nativeBalance.decimals) : 0}
            usdValue={nativePrice}
          />

          {/* Custom Tokens */}
          {customTokens && customTokens.length > 0 ? (
            customTokens.map((token) => (
              <CustomTokenItem
                key={token.contract_address}
                address={token.contract_address}
                name={token.name}
                symbol={token.symbol}
                decimals={token.decimals}
                logo={token.logo_url}
                userAddress={address as `0x${string}`}
                chainId={chainId}
              />
            ))
          ) : (
            <Card className="border-dashed border-primary/20">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground text-center">
                  Chưa có token nào. Nhấn "Thêm Token" để thêm token tùy chỉnh.
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <AddTokenModal
        isOpen={isAddTokenOpen}
        onClose={() => setIsAddTokenOpen(false)}
      />

      <AutoDetectModal
        isOpen={isAutoDetectOpen}
        onClose={() => {
          setIsAutoDetectOpen(false);
          setDetectedTokens([]);
        }}
        tokens={detectedTokens}
        isLoading={isDetecting}
        onAddSelected={handleAddSelectedTokens}
      />
    </>
  );
}

// Component to display custom token with real balance
function CustomTokenItem({
  address,
  name,
  symbol,
  decimals,
  logo,
  userAddress,
  chainId,
}: {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo: string | null;
  userAddress: `0x${string}`;
  chainId?: number;
}) {
  const { data: tokenBalance, isLoading } = useReadContract({
    address: address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress],
  });

  // Try to get price by token symbol first, then by contract
  const { data: priceBySymbol } = useTokenPrice(symbol);
  const { data: priceByContract } = useTokenPriceByContract(chainId, address);
  const tokenPrice = priceBySymbol || priceByContract;

  const rawBalanceValue = tokenBalance ? Number(tokenBalance) / Math.pow(10, decimals) : 0;

  return (
    <TokenItem
      logoUrl={logo}
      name={name}
      symbol={symbol}
      balance={formatBalance(rawBalanceValue)}
      rawBalance={rawBalanceValue}
      usdValue={tokenPrice}
      isLoading={isLoading}
    />
  );
}
