import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWallet } from "@/contexts/WalletContext";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowDown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Popular tokens on BNB Chain
const POPULAR_TOKENS = [
  { symbol: "BNB", name: "BNB", address: "BNB", decimals: 18 },
  { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
  { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
  { symbol: "BUSD", name: "Binance USD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18 },
  { symbol: "CAKE", name: "PancakeSwap", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18 },
];

export default function SwapModal({ isOpen, onClose }: SwapModalProps) {
  const { address, chainId, customTokens } = useWallet();
  const [fromToken, setFromToken] = useState("BNB");
  const [toToken, setToToken] = useState(POPULAR_TOKENS[1].address);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [swapData, setSwapData] = useState<any>(null);
  const [hasHandledSuccess, setHasHandledSuccess] = useState(false);

  const { data: hash, isPending, sendTransaction } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Combine available tokens
  const availableTokens = [
    ...POPULAR_TOKENS,
    ...(customTokens || []).map(t => ({
      symbol: t.symbol,
      name: t.name,
      address: t.contract_address,
      decimals: t.decimals,
    })),
  ];

  // Get quote from 0x API
  const fetchQuote = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0 || chainId !== 56) return;

    setIsLoadingQuote(true);
    try {
      const sellToken = fromToken === "BNB" ? "BNB" : fromToken;
      const buyToken = toToken === "BNB" ? "BNB" : toToken;
      const sellAmount = (parseFloat(fromAmount) * 1e18).toString();

      const response = await fetch(
        `https://bsc.api.0x.org/swap/v1/quote?` +
        `sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${sellAmount}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch quote");
      }

      const data = await response.json();
      setSwapData(data);
      setToAmount((parseFloat(data.buyAmount) / 1e18).toFixed(6));
    } catch (error) {
      console.error("Error fetching quote:", error);
      toast({
        title: "Lỗi",
        description: "Không thể lấy tỷ giá. Vui lòng thử lại.",
        variant: "destructive",
      });
      setToAmount("");
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // Fetch quote when amount changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fromAmount && parseFloat(fromAmount) > 0) {
        fetchQuote();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [fromAmount, fromToken, toToken]);

  const handleSwap = async () => {
    if (!swapData || !address) {
      toast({
        title: "Lỗi",
        description: "Không có dữ liệu swap",
        variant: "destructive",
      });
      return;
    }

    try {
      sendTransaction({
        to: swapData.to as `0x${string}`,
        data: swapData.data as `0x${string}`,
        value: BigInt(swapData.value || "0"),
      });
    } catch (error) {
      console.error("Swap error:", error);
      toast({
        title: "Lỗi",
        description: "Hoán đổi thất bại",
        variant: "destructive",
      });
    }
  };

  // Confetti celebration effect
  const fireConfetti = () => {
    const colors = ['#ff69b4', '#ff1493', '#ffd700', '#ff6b6b', '#ffffff', '#ff85c1'];
    
    // Initial burst from center
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors,
    });
    
    // Continuous burst from corners
    const end = Date.now() + 2000;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });
      
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  // Save transaction when confirmed
  const saveTransaction = async (txHash: string) => {
    if (!address) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      chain: "bnb",
      tx_hash: txHash,
      type: "swap",
      from_address: address,
      to_address: address,
      amount: `${fromAmount} ${fromToken}`,
    });

    if (error) {
      console.error("Error saving transaction:", error);
    }
  };

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && hash && !hasHandledSuccess) {
      setHasHandledSuccess(true);
      
      // Fire confetti celebration
      fireConfetti();
      
      // Save transaction
      saveTransaction(hash);
      
      // Show success toast
      toast({
        title: "🎉 Thành công!",
        description: "Hoán đổi thành công!",
      });
      
      // Reset form after 1.5s to let user see confetti
      setTimeout(() => {
        setFromAmount("");
        setToAmount("");
        setSwapData(null);
        onClose();
      }, 1500);
    }
  }, [isSuccess, hash, hasHandledSuccess]);

  const handleClose = () => {
    if (!isPending && !isConfirming) {
      setFromAmount("");
      setToAmount("");
      setSwapData(null);
      setHasHandledSuccess(false);
      onClose();
    }
  };

  if (chainId !== 56) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hoán đổi Token</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              Vui lòng chuyển sang mạng BNB Chain để sử dụng tính năng hoán đổi
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hoán đổi Token</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <Label>Từ</Label>
            <div className="flex gap-2">
              <Select value={fromToken} onValueChange={setFromToken}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTokens.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.0001"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Swap Icon */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchQuote}
              disabled={isLoadingQuote}
            >
              {isLoadingQuote ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <Label>Đến</Label>
            <div className="flex gap-2">
              <Select value={toToken} onValueChange={setToToken}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_TOKENS.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="text"
                placeholder="0.00"
                value={toAmount}
                readOnly
                disabled
              />
            </div>
          </div>

          {/* Exchange Rate */}
          {toAmount && !isLoadingQuote && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground">
                Tỷ giá: 1{" "}
                {availableTokens.find((t) => t.address === fromToken)?.symbol} ≈{" "}
                {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)}{" "}
                {availableTokens.find((t) => t.address === toToken)?.symbol}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isPending || isConfirming}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              onClick={handleSwap}
              disabled={
                !fromAmount ||
                !toAmount ||
                !swapData ||
                isPending ||
                isConfirming
              }
              className="flex-1"
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isPending ? "Đang xác nhận..." : "Đang xử lý..."}
                </>
              ) : (
                "Hoán đổi"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
