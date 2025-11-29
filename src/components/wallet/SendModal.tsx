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
import { useWallet } from "@/contexts/WalletContext";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, isAddress } from "viem";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SendModal({ isOpen, onClose }: SendModalProps) {
  const { address, balance, chainId } = useWallet();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [hasHandledSuccess, setHasHandledSuccess] = useState(false);

  const { data: hash, isPending, sendTransaction } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleAddressChange = (value: string) => {
    setRecipientAddress(value);
    if (value) {
      setIsValidAddress(isAddress(value));
    } else {
      setIsValidAddress(true);
    }
  };

  const handleSend = async () => {
    if (!address || !recipientAddress || !amount || !isAddress(recipientAddress)) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ thông tin hợp lệ",
        variant: "destructive",
      });
      return;
    }

    const amountFloat = parseFloat(amount);
    const balanceFloat = parseFloat(balance || "0");

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
      sendTransaction({
        to: recipientAddress as `0x${string}`,
        value: parseEther(amount),
      });
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
    if (!address || !chainId) return;

    const chainMap: Record<number, "bnb" | "ethereum"> = {
      56: "bnb",
      1: "ethereum",
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      chain: chainMap[chainId],
      tx_hash: txHash,
      type: "send",
      from_address: address,
      to_address: recipientAddress,
      amount: amount,
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
        description: "Giao dịch đã được gửi thành công!",
      });
      
      // Reset form after 1.5s to let user see confetti
      setTimeout(() => {
        setRecipientAddress("");
        setAmount("");
        onClose();
      }, 1500);
    }
  }, [isSuccess, hash, hasHandledSuccess]);

  const handleClose = () => {
    if (!isPending && !isConfirming) {
      setRecipientAddress("");
      setAmount("");
      setHasHandledSuccess(false);
      onClose();
    }
  };

  const chainSymbol = chainId === 56 ? "BNB" : "ETH";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gửi {chainSymbol}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
            <Label htmlFor="amount">Số lượng {chainSymbol}</Label>
            <Input
              id="amount"
              type="number"
              step="0.0001"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Số dư: {balance} {chainSymbol}
            </p>
          </div>

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
              onClick={handleSend}
              disabled={
                !recipientAddress ||
                !amount ||
                !isValidAddress ||
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
                "Gửi"
              )}
            </Button>
          </div>

          {hash && (
            <p className="text-sm text-muted-foreground break-all">
              Transaction hash: {hash}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
