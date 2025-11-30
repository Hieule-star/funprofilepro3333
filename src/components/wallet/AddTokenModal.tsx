import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { isAddress, createPublicClient, http } from "viem";
import { bsc, mainnet } from "wagmi/chains";
import { fetchTokenLogo } from "@/lib/coingecko";

const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
] as const;

// Popular tokens by chain
const POPULAR_TOKENS = {
  56: [ // BNB Chain
    {
      name: "Tether USD",
      symbol: "USDT",
      address: "0x55d398326f99059fF775485246999027B3197955",
      decimals: 18,
      logo: "🔷",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      decimals: 18,
      logo: "💠",
    },
    {
      name: "Binance USD",
      symbol: "BUSD",
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      decimals: 18,
      logo: "💰",
    },
    {
      name: "PancakeSwap Token",
      symbol: "CAKE",
      address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
      decimals: 18,
      logo: "🥞",
    },
    {
      name: "CAMLY COIN",
      symbol: "CAMLY",
      address: "0x0910320181889fefde0bb1ca63962b0a8882e413",
      decimals: 9,
      logo: "😊",
    },
  ],
  1: [ // Ethereum
    {
      name: "Tether USD",
      symbol: "USDT",
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      decimals: 6,
      logo: "🔷",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      decimals: 6,
      logo: "💠",
    },
    {
      name: "Dai Stablecoin",
      symbol: "DAI",
      address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      decimals: 18,
      logo: "📊",
    },
    {
      name: "Wrapped Bitcoin",
      symbol: "WBTC",
      address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      decimals: 8,
      logo: "₿",
    },
  ],
};

interface AddTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  logo_url?: string | null;
}

export default function AddTokenModal({ isOpen, onClose }: AddTokenModalProps) {
  const [contractAddress, setContractAddress] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [showPopular, setShowPopular] = useState(true);
  const { addCustomToken, chainId } = useWallet();
  const { toast } = useToast();

  const popularTokens = chainId ? POPULAR_TOKENS[chainId as keyof typeof POPULAR_TOKENS] || [] : [];

  // Fetch token info from blockchain
  const handleFetchTokenInfo = async () => {
    if (!contractAddress) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập địa chỉ contract",
        variant: "destructive",
      });
      return;
    }

    if (!isAddress(contractAddress)) {
      toast({
        title: "Lỗi",
        description: "Địa chỉ contract không hợp lệ",
        variant: "destructive",
      });
      return;
    }

    if (!chainId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng kết nối ví trước",
        variant: "destructive",
      });
      return;
    }

    setIsFetching(true);
    setManualMode(false);
    
    try {
      const chain = chainId === 56 ? bsc : chainId === 1 ? mainnet : null;
      if (!chain) {
        throw new Error("Network không được hỗ trợ");
      }

      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      const [name, symbol, decimals] = await Promise.all([
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'name' as const,
        } as any),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'symbol' as const,
        } as any),
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'decimals' as const,
        } as any),
      ]);

      // Fetch logo from CoinGecko
      const logoInfo = await fetchTokenLogo(contractAddress, chainId);

      setTokenInfo({
        name: name as string,
        symbol: symbol as string,
        decimals: Number(decimals),
        logo_url: logoInfo.logo_url,
      });

      toast({
        title: "Thành công",
        description: "Đã tải thông tin token từ blockchain",
      });
    } catch (error) {
      console.error("Error fetching token info:", error);
      setManualMode(true);
      toast({
        title: "Không thể tự động lấy thông tin",
        description: "Vui lòng nhập thông tin token thủ công",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleAddToken = async () => {
    if (!tokenInfo) return;

    setIsAdding(true);
    try {
      console.log('[AddTokenModal] Adding token:', {
        contractAddress: contractAddress.toLowerCase(),
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        chainId,
      });

      await addCustomToken({
        contract_address: contractAddress.toLowerCase(),
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        logo_url: tokenInfo.logo_url || null,
      });

      toast({
        title: "Thành công",
        description: `Đã thêm token ${tokenInfo.symbol}`,
      });

      // Reset and close
      handleClose();
    } catch (error: any) {
      console.error('[AddTokenModal] Error details:', {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
      });
      
      let errorMessage = "Không thể thêm token. Vui lòng thử lại.";
      
      if (error.message === 'TOKEN_ALREADY_EXISTS') {
        errorMessage = `Token ${tokenInfo.symbol} đã có trong danh sách của bạn.`;
      } else if (error.message?.includes('duplicate key')) {
        errorMessage = `Token này đã tồn tại trong ví của bạn.`;
      }
      
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleSelectPopularToken = async (token: typeof popularTokens[0]) => {
    setContractAddress(token.address);
    setIsFetching(true);
    
    try {
      // Fetch logo from CoinGecko for popular tokens too
      const logoInfo = await fetchTokenLogo(token.address, chainId!);
      
      setTokenInfo({
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        logo_url: logoInfo.logo_url,
      });
    } catch (error) {
      console.error('Error fetching logo for popular token:', error);
      setTokenInfo({
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        logo_url: null,
      });
    } finally {
      setIsFetching(false);
      setShowPopular(false);
      setManualMode(false);
    }
  };

  const handleClose = () => {
    setContractAddress("");
    setTokenInfo(null);
    setManualMode(false);
    setShowPopular(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm Token Tùy Chỉnh</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {showPopular && popularTokens.length > 0 && !tokenInfo && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Token Phổ Biến</Label>
                <span className="text-xs text-muted-foreground">
                  {chainId === 56 ? 'BNB Chain' : 'Ethereum'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {popularTokens.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => handleSelectPopularToken(token)}
                    disabled={isAdding}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent hover:border-primary/40 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <span className="text-2xl">{token.logo}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate group-hover:text-primary">
                        {token.symbol}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {token.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Hoặc nhập địa chỉ contract
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="contract">Địa chỉ Contract Token</Label>
            <div className="flex gap-2">
              <Input
                id="contract"
                placeholder="0x..."
                value={contractAddress}
                onChange={(e) => {
                  setContractAddress(e.target.value);
                  setTokenInfo(null);
                  setManualMode(false);
                  setShowPopular(false);
                }}
                disabled={isFetching || isAdding}
              />
              <Button
                onClick={handleFetchTokenInfo}
                disabled={isFetching || isAdding || !contractAddress}
              >
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lấy thông tin"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Nhập địa chỉ contract BEP-20 (BNB Chain) hoặc ERC-20 (Ethereum)
            </p>
          </div>

          {tokenInfo && !manualMode && (
            <div className="space-y-3 p-4 border border-primary/20 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {tokenInfo.logo_url ? (
                    <img 
                      src={tokenInfo.logo_url} 
                      alt={tokenInfo.symbol}
                      className="w-8 h-8 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-2xl">🪙</span>
                  )}
                  <span className="text-sm font-medium text-primary">✓ Đã tìm thấy token</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setManualMode(true)}
                  className="h-7 text-xs"
                >
                  Chỉnh sửa
                </Button>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tên Token</Label>
                <p className="font-semibold">{tokenInfo.name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Symbol</Label>
                <p className="font-semibold">{tokenInfo.symbol}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Decimals</Label>
                <p className="font-semibold">{tokenInfo.decimals}</p>
              </div>
              {tokenInfo.logo_url && (
                <p className="text-xs text-muted-foreground">
                  ✓ Logo được lưu từ CoinGecko
                </p>
              )}
            </div>
          )}

          {manualMode && (
            <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground mb-3">Nhập thông tin token thủ công:</p>
              <div className="space-y-2">
                <Label htmlFor="name">Tên Token</Label>
                <Input
                  id="name"
                  placeholder="Ví dụ: HAPPY CAMLY COIN"
                  value={tokenInfo?.name || ""}
                  onChange={(e) => setTokenInfo(prev => ({ ...prev!, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="Ví dụ: CAMLY"
                  value={tokenInfo?.symbol || ""}
                  onChange={(e) => setTokenInfo(prev => ({ ...prev!, symbol: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="decimals">Decimals</Label>
                <Input
                  id="decimals"
                  type="number"
                  placeholder="Thường là 18"
                  value={tokenInfo?.decimals || ""}
                  onChange={(e) => setTokenInfo(prev => ({ ...prev!, decimals: parseInt(e.target.value) || 18 }))}
                />
              </div>
            </div>
          )}

          {(tokenInfo || manualMode) && (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose} disabled={isAdding}>
                Hủy
              </Button>
              <Button
                onClick={handleAddToken}
                disabled={!tokenInfo || !tokenInfo.name || !tokenInfo.symbol || isAdding}
              >
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận thêm"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
