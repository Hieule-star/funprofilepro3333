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
import { Loader2, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseUnits, formatUnits, encodeFunctionData, decodeAbiParameters } from "viem";

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// PancakeSwap Router V2 on BSC
const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E" as const;
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" as const;

// Router ABI (only necessary functions)
const ROUTER_ABI = [
  {
    name: "getAmountsOut",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  },
  {
    name: "swapExactTokensForTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  },
  {
    name: "swapExactETHForTokens",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  },
  {
    name: "swapExactTokensForETH",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  }
] as const;

// ERC20 ABI for approve and allowance
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

// Popular tokens on BNB Chain
const POPULAR_TOKENS = [
  { symbol: "BNB", name: "BNB", address: "BNB", decimals: 18 },
  { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
  { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
  { symbol: "BUSD", name: "Binance USD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", decimals: 18 },
  { symbol: "CAKE", name: "PancakeSwap", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18 },
  { symbol: "CAMLY", name: "CAMLY COIN", address: "0x0910320181889fefde0bb1ca63962b0a8882e413", decimals: 3 },
];

// CAMLY token address (lowercase for comparison)
const CAMLY_ADDRESS = "0x0910320181889fefde0bb1ca63962b0a8882e413";

interface SwapData {
  path: `0x${string}`[];
  amountIn: bigint;
  amountOutMin: bigint;
  amountOut: bigint;
  sellDecimals: number;
  buyDecimals: number;
}

export default function SwapModal({ isOpen, onClose }: SwapModalProps) {
  const { address, chainId, customTokens } = useWallet();
  const [fromToken, setFromToken] = useState("BNB");
  const [toToken, setToToken] = useState(POPULAR_TOKENS[1].address);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [swapData, setSwapData] = useState<SwapData | null>(null);
  const [hasHandledSuccess, setHasHandledSuccess] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | undefined>();

  const { data: hash, isPending, sendTransaction, reset: resetTransaction } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const { isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approvalHash });

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

  // Get swap path for PancakeSwap
  const getSwapPath = (fromAddr: string, toAddr: string): `0x${string}`[] => {
    const fromLower = fromAddr.toLowerCase();
    const toLower = toAddr.toLowerCase();
    
    // BNB → Token: [WBNB, Token] or [WBNB, WBNB, Token] if through WBNB
    if (fromAddr === "BNB") {
      if (toLower === CAMLY_ADDRESS) {
        return [WBNB, toAddr as `0x${string}`];
      }
      return [WBNB, toAddr as `0x${string}`];
    }
    
    // Token → BNB: [Token, WBNB]
    if (toAddr === "BNB") {
      if (fromLower === CAMLY_ADDRESS) {
        return [fromAddr as `0x${string}`, WBNB];
      }
      return [fromAddr as `0x${string}`, WBNB];
    }
    
    // CAMLY → Other token: [CAMLY, WBNB, Token]
    if (fromLower === CAMLY_ADDRESS) {
      return [fromAddr as `0x${string}`, WBNB, toAddr as `0x${string}`];
    }
    
    // Other token → CAMLY: [Token, WBNB, CAMLY]
    if (toLower === CAMLY_ADDRESS) {
      return [fromAddr as `0x${string}`, WBNB, toAddr as `0x${string}`];
    }
    
    // Default: direct or through WBNB
    return [fromAddr as `0x${string}`, WBNB, toAddr as `0x${string}`];
  };

  // Fetch quote from PancakeSwap
  const fetchQuote = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0 || chainId !== 56) return;

    setIsLoadingQuote(true);
    setSwapData(null);
    setToAmount("");
    
    try {
      const sellTokenInfo = availableTokens.find(t => t.address === fromToken);
      const buyTokenInfo = availableTokens.find(t => t.address === toToken);
      
      const sellDecimals = sellTokenInfo?.decimals || 18;
      const buyDecimals = buyTokenInfo?.decimals || 18;
      
      const amountIn = parseUnits(fromAmount, sellDecimals);
      const path = getSwapPath(fromToken, toToken);
      
      // Call PancakeSwap Router getAmountsOut
      const callData = encodeFunctionData({
        abi: ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountIn, path]
      });

      const response = await fetch('https://bsc-dataseed.binance.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: PANCAKE_ROUTER, data: callData }, 'latest']
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || "Không tìm thấy đường đổi");
      }

      if (!data.result || data.result === "0x") {
        throw new Error("Không có thanh khoản cho cặp token này");
      }

      // Decode amounts array
      const decoded = decodeAbiParameters(
        [{ name: 'amounts', type: 'uint256[]' }],
        data.result
      );
      const amounts = decoded[0] as bigint[];
      const amountOut = amounts[amounts.length - 1];
      
      // Calculate amountOutMin with 1% slippage
      const amountOutMin = (amountOut * 99n) / 100n;
      
      setSwapData({
        path,
        amountIn,
        amountOut,
        amountOutMin,
        sellDecimals,
        buyDecimals,
      });
      
      setToAmount(formatUnits(amountOut, buyDecimals));
      
      // Check allowance if not BNB
      if (fromToken !== "BNB" && address) {
        await checkAllowance(amountIn);
      } else {
        setNeedsApproval(false);
      }
    } catch (error) {
      console.error("Error fetching quote:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không tìm thấy đường đổi cho cặp token này",
        variant: "destructive",
      });
      setToAmount("");
      setSwapData(null);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // Check token allowance
  const checkAllowance = async (amountIn: bigint) => {
    if (!address || fromToken === "BNB") {
      setNeedsApproval(false);
      return;
    }

    try {
      const callData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address as `0x${string}`, PANCAKE_ROUTER]
      });

      const response = await fetch('https://bsc-dataseed.binance.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: fromToken, data: callData }, 'latest']
        })
      });

      const data = await response.json();
      const currentAllowance = BigInt(data.result || "0");
      
      setNeedsApproval(currentAllowance < amountIn);
    } catch (error) {
      console.error("Error checking allowance:", error);
      setNeedsApproval(true);
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

  // Handle approval success - then execute swap
  useEffect(() => {
    if (isApprovalSuccess && isApproving) {
      setIsApproving(false);
      setNeedsApproval(false);
      setApprovalHash(undefined);
      toast({
        title: "Phê duyệt thành công",
        description: "Bây giờ bạn có thể thực hiện hoán đổi",
      });
    }
  }, [isApprovalSuccess, isApproving]);

  const handleApprove = async () => {
    if (!swapData || !address) return;

    setIsApproving(true);
    try {
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [PANCAKE_ROUTER, swapData.amountIn]
      });

      sendTransaction({
        to: fromToken as `0x${string}`,
        data: approveData,
      }, {
        onSuccess: (hash) => {
          setApprovalHash(hash);
        },
        onError: () => {
          setIsApproving(false);
        }
      });
    } catch (error) {
      console.error("Approve error:", error);
      setIsApproving(false);
      toast({
        title: "Lỗi",
        description: "Phê duyệt thất bại",
        variant: "destructive",
      });
    }
  };

  const handleSwap = async () => {
    if (!swapData || !address) {
      toast({
        title: "Lỗi",
        description: "Không có dữ liệu swap",
        variant: "destructive",
      });
      return;
    }

    // If needs approval, handle that first
    if (needsApproval && fromToken !== "BNB") {
      handleApprove();
      return;
    }

    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes
      
      let txData: `0x${string}`;
      let value: bigint = 0n;

      if (fromToken === "BNB") {
        // swapExactETHForTokens
        txData = encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'swapExactETHForTokens',
          args: [swapData.amountOutMin, swapData.path, address as `0x${string}`, deadline]
        });
        value = swapData.amountIn;
      } else if (toToken === "BNB") {
        // swapExactTokensForETH
        txData = encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'swapExactTokensForETH',
          args: [swapData.amountIn, swapData.amountOutMin, swapData.path, address as `0x${string}`, deadline]
        });
      } else {
        // swapExactTokensForTokens
        txData = encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [swapData.amountIn, swapData.amountOutMin, swapData.path, address as `0x${string}`, deadline]
        });
      }

      sendTransaction({
        to: PANCAKE_ROUTER,
        data: txData,
        value,
      });
    } catch (error) {
      console.error("Swap error:", error);
      toast({
        title: "Lỗi",
        description: "Hoán đổi thất bại. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  // Confetti celebration effect
  const fireConfetti = () => {
    const colors = ['#ff69b4', '#ff1493', '#ffd700', '#ff6b6b', '#ffffff', '#ff85c1'];
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors,
    });
    
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
    if (!address || !chainId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: wallet } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .eq("chain_id", chainId)
      .single();

    if (!wallet) return;

    const fromSymbol = availableTokens.find(t => t.address === fromToken)?.symbol || fromToken;
    const toSymbol = availableTokens.find(t => t.address === toToken)?.symbol || toToken;

    await supabase.from("transactions").insert({
      user_id: user.id,
      wallet_id: wallet.id,
      tx_hash: txHash,
      type: "swap",
      from_address: address,
      to_address: address,
      token_symbol: `${fromSymbol}→${toSymbol}`,
      amount: `${fromAmount} ${fromSymbol} → ${toAmount} ${toSymbol}`,
    });
  };

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess && hash && !hasHandledSuccess && !isApproving) {
      setHasHandledSuccess(true);
      
      fireConfetti();
      saveTransaction(hash);
      
      toast({
        title: "🎉 Thành công!",
        description: "Hoán đổi thành công!",
      });
      
      setTimeout(() => {
        setFromAmount("");
        setToAmount("");
        setSwapData(null);
        onClose();
      }, 1500);
    }
  }, [isSuccess, hash, hasHandledSuccess, isApproving]);

  const handleClose = () => {
    if (!isPending && !isConfirming && !isApproving) {
      setFromAmount("");
      setToAmount("");
      setSwapData(null);
      setHasHandledSuccess(false);
      setNeedsApproval(false);
      setIsApproving(false);
      setApprovalHash(undefined);
      resetTransaction();
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

  const fromSymbol = availableTokens.find(t => t.address === fromToken)?.symbol;
  const toSymbol = availableTokens.find(t => t.address === toToken)?.symbol;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hoán đổi Token (PancakeSwap)</DialogTitle>
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
                  {availableTokens.map((token) => (
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

          {/* Exchange Rate & Path Info */}
          {toAmount && !isLoadingQuote && swapData && (
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <p className="text-muted-foreground">
                Tỷ giá: 1 {fromSymbol} ≈ {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toSymbol}
              </p>
              <p className="text-muted-foreground text-xs">
                Đường đổi: {swapData.path.map((addr, i) => {
                  if (addr.toLowerCase() === WBNB.toLowerCase()) return "WBNB";
                  const token = availableTokens.find(t => t.address.toLowerCase() === addr.toLowerCase());
                  return token?.symbol || addr.slice(0, 6);
                }).join(" → ")}
              </p>
              <p className="text-muted-foreground text-xs">
                Slippage: 1%
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isPending || isConfirming || isApproving}
              className="flex-1"
            >
              Hủy
            </Button>
            
            {needsApproval && fromToken !== "BNB" ? (
              <Button
                onClick={handleApprove}
                disabled={isPending || isConfirming || isApproving || !swapData}
                className="flex-1"
              >
                {isApproving || isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang phê duyệt...
                  </>
                ) : (
                  `Phê duyệt ${fromSymbol}`
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSwap}
                disabled={!fromAmount || !toAmount || !swapData || isPending || isConfirming}
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
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
