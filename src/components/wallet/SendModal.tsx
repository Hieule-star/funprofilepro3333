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
import { useWallet, CustomToken } from "@/contexts/WalletContext";
import { useSendTransaction, useWaitForTransactionReceipt, useWriteContract, useReadContract } from "wagmi";
import { parseEther, isAddress, parseUnits } from "viem";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  customTokens?: CustomToken[];
  preSelectedToken?: {
    symbol: string;
    name: string;
    contract_address?: string;
    decimals: number;
    balance: number;
    logo_url?: string | null;
  };
}

export default function SendModal({ isOpen, onClose, customTokens = [], preSelectedToken }: SendModalProps) {
  const { address, balance, chainId } = useWallet();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [hasHandledSuccess, setHasHandledSuccess] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<string>("native");

  // Get selected token details
  const selectedToken = selectedTokenId === "native" 
    ? {
        symbol: chainId === 56 ? "BNB" : "ETH",
        name: chainId === 56 ? "BNB" : "Ethereum",
        balance: balance || "0",
        decimals: 18,
        contract_address: undefined as string | undefined,
      }
    : customTokens.find(t => `${t.contract_address}-${t.chain_id}` === selectedTokenId);

  // Read ERC20 balance for selected token
  const { data: erc20Balance } = useReadContract({
    address: selectedToken?.contract_address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!selectedToken?.contract_address && !!address,
    },
  });

  const tokenBalance = selectedToken?.contract_address && erc20Balance
    ? (Number(erc20Balance) / Math.pow(10, selectedToken.decimals)).toString()
    : 'balance' in selectedToken ? selectedToken.balance : (balance || "0");

  const { data: hash, isPending, sendTransaction } = useSendTransaction();
  const { data: erc20Hash, isPending: isErc20Pending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: hash || erc20Hash,
  });

  // Set pre-selected token on mount
  useEffect(() => {
    if (preSelectedToken && isOpen) {
      if (preSelectedToken.contract_address) {
        const tokenId = `${preSelectedToken.contract_address}-${chainId}`;
        setSelectedTokenId(tokenId);
      } else {
        setSelectedTokenId("native");
      }
    }
  }, [preSelectedToken, isOpen, chainId]);

  const handleAddressChange = (value: string) => {
    setRecipientAddress(value);
    if (value) {
      setIsValidAddress(isAddress(value));
    } else {
      setIsValidAddress(true);
    }
  };

  const handleSend = async () => {
    if (!address || !recipientAddress || !amount || !isAddress(recipientAddress) || !selectedToken) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ thông tin hợp lệ",
        variant: "destructive",
      });
      return;
    }

    const amountFloat = parseFloat(amount);
    const balanceFloat = parseFloat(tokenBalance);

    if (amountFloat <= 0) {
      toast({
        title: "Lỗi",
        description: "Số lượng phải lớn hơn 0",
        variant: "destructive",
      });
      return;
    }

    if (amountFloat > balanceFloat) {
      toast({
        title: "Lỗi",
        description: "Số dư không đủ",
        variant: "destructive",
      });
      return;
    }

    try {
      if (selectedToken.contract_address) {
        // Send ERC20 token
        writeContract({
          address: selectedToken.contract_address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [
            recipientAddress as `0x${string}`,
            parseUnits(amount, selectedToken.decimals),
          ],
        } as any); // Type assertion for wagmi v2 compatibility
      } else {
        // Send native token
        sendTransaction({
          to: recipientAddress as `0x${string}`,
          value: parseEther(amount),
        });
      }
    } catch (error) {
      console.error("Send error:", error);
      toast({
        title: "Lỗi",
        description: "Giao dịch thất bại",
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

  // Save transaction to database when confirmed
  const saveTransaction = async (txHash: string) => {
    if (!address || !chainId || !selectedToken) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get wallet_id first
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .eq("chain_id", chainId)
      .single();

    if (!wallet) return;

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      wallet_id: wallet.id,
      tx_hash: txHash,
      type: "send",
      from_address: address,
      to_address: recipientAddress,
      token_symbol: selectedToken.symbol,
      amount: amount,
    });

    if (error) {
      console.error("Error saving transaction:", error);
    }
  };

  // Handle successful transaction
  useEffect(() => {
    const txHash = hash || erc20Hash;
    if (isSuccess && txHash && !hasHandledSuccess) {
      setHasHandledSuccess(true);
      
      // Fire confetti celebration
      fireConfetti();
      
      // Save transaction
      saveTransaction(txHash);
      
      // Show success toast
      toast({
        title: "🎉 Thành công!",
        description: "Giao dịch đã được gửi thành công!",
      });
      
      // Reset form after 1.5s to let user see confetti
      setTimeout(() => {
        setRecipientAddress("");
        setAmount("");
        setSelectedTokenId("native");
        onClose();
      }, 1500);
    }
  }, [isSuccess, hash, erc20Hash, hasHandledSuccess]);

  const handleClose = () => {
    if (!isPending && !isConfirming && !isErc20Pending) {
      setRecipientAddress("");
      setAmount("");
      setHasHandledSuccess(false);
      setSelectedTokenId("native");
      onClose();
    }
  };

  const isProcessing = isPending || isConfirming || isErc20Pending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gửi Token</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Chọn Token</Label>
            <Select value={selectedTokenId} onValueChange={setSelectedTokenId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="native">
                  {chainId === 56 ? "🟡 BNB" : "🔷 ETH"}
                </SelectItem>
                {customTokens
                  .filter(token => token.chain_id === chainId)
                  .map((token) => (
                    <SelectItem 
                      key={`${token.contract_address}-${token.chain_id}`}
                      value={`${token.contract_address}-${token.chain_id}`}
                    >
                      {token.symbol} - {token.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Số dư: {tokenBalance} {selectedToken?.symbol}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">Địa chỉ người nhận</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => handleAddressChange(e.target.value)}
              className={!isValidAddress ? "border-destructive" : ""}
            />
            {!isValidAddress && (
              <p className="text-sm text-destructive">Địa chỉ không hợp lệ</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Số lượng {selectedToken?.symbol}</Label>
            <Input
              id="amount"
              type="number"
              step="0.0001"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              onClick={handleSend}
              disabled={
                !recipientAddress ||
                !amount ||
                !isValidAddress ||
                isProcessing
              }
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isPending || isErc20Pending ? "Đang xác nhận..." : "Đang xử lý..."}
                </>
              ) : (
                "Gửi"
              )}
            </Button>
          </div>

          {(hash || erc20Hash) && (
            <p className="text-sm text-muted-foreground break-all">
              Transaction hash: {hash || erc20Hash}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
