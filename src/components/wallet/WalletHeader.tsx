import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, TrendingUp } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { supportedChains } from "@/lib/wagmi-config";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import NetworkSelector from "./NetworkSelector";
import ConnectWalletModal from "./ConnectWalletModal";
import { useBalance } from "wagmi";
import { useTokenPrice } from "@/hooks/useTokenPrice";

export default function WalletHeader() {
  const { isConnected, address, chainId } = useWallet();
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  const currentChain = chainId ? supportedChains[chainId] : null;
  
  const { data: nativeBalance } = useBalance({
    address: address as `0x${string}`,
  });

  const nativeSymbol = chainId === 56 ? "BNB" : "ETH";
  const { data: nativePrice } = useTokenPrice(nativeSymbol);
  
  const balance = nativeBalance 
    ? `${(Number(nativeBalance.value) / Math.pow(10, nativeBalance.decimals)).toFixed(4)}`
    : undefined;

  const balanceNum = nativeBalance 
    ? Number(nativeBalance.value) / Math.pow(10, nativeBalance.decimals)
    : 0;
  
  const usdValue = nativePrice && balanceNum ? balanceNum * nativePrice : null;

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast({
        title: "Đã sao chép địa chỉ",
        description: "Địa chỉ ví đã được sao chép vào clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getNetworkIcon = () => {
    if (!currentChain) return "🔗";
    return currentChain.symbol === "BNB" ? "🟡" : "🔷";
  };

  if (!isConnected) {
    return (
      <>
        <Card className="border-primary/20 shadow-glow overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 via-green-400 to-yellow-400">
            <CardContent className="pt-6">
              <div className="text-center text-white drop-shadow-sm">
                <div className="text-6xl mb-4">👛</div>
                <h2 className="text-2xl font-heading font-bold mb-2 text-white">Kết nối ví của bạn</h2>
                <p className="text-sm text-white/90 mb-6">
                  Kết nối ví để xem số dư và quản lý tài sản crypto
                </p>
                <div className="flex flex-col items-center gap-4">
                  <Button 
                    size="lg" 
                    onClick={() => setModalOpen(true)}
                    className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-8"
                  >
                    🔗 Kết nối ví
                  </Button>
                  <p className="text-xs text-white/75 max-w-md">
                    Hỗ trợ đăng nhập Google/Email → Tạo ví ERC-4337 hoặc kết nối MetaMask, Trust Wallet...
                  </p>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
        <ConnectWalletModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }

  return (
    <Card className="border-primary/20 shadow-glow overflow-hidden">
      <div className="bg-gradient-to-r from-green-500 via-green-400 to-yellow-400">
        <CardContent className="pt-6">
          <div className="text-white drop-shadow-sm">
          {/* Network Badge & Actions */}
          <div className="flex justify-between items-start mb-6">
            <Badge variant="secondary" className="text-lg px-4 py-2 text-foreground">
              <span className="mr-2 text-2xl">{getNetworkIcon()}</span>
              {currentChain?.name || "Unknown"}
            </Badge>
            <div className="flex gap-2">
              <NetworkSelector />
              <Button
                variant="outline"
                onClick={() => setModalOpen(true)}
                className="bg-white text-gray-900 hover:bg-gray-100 border-gray-200"
              >
                Quản lý ví
              </Button>
            </div>
          </div>

          {/* Balance Display */}
          <div className="text-center mb-6">
            <p className="text-sm opacity-75 mb-2">Số dư</p>
            <h1 className="text-6xl font-heading font-bold mb-2 animate-in fade-in duration-500">
              {balance || '0'}
            </h1>
            <p className="text-lg opacity-90 mb-2">{currentChain?.symbol || ''}</p>
            {usdValue !== null && (
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="h-5 w-5 opacity-75" />
                <p className="text-2xl font-semibold">
                  ~${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>

          {/* Address */}
          {address && (
            <div className="flex items-center justify-center gap-2 bg-white/10 rounded-lg px-4 py-3">
              <p className="text-sm font-mono text-white/90">
                {address.slice(0, 10)}...{address.slice(-8)}
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyAddress}
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
        </CardContent>
      </div>
      <ConnectWalletModal open={modalOpen} onOpenChange={setModalOpen} />
    </Card>
  );
}
