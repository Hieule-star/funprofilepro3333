import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Coins, ArrowRight, Loader2, ExternalLink, Gift, Sparkles } from "lucide-react";
import { useWallets } from "@privy-io/react-auth";
import { triggerFloatingHearts } from "@/components/ui/floating-hearts";

interface ClaimCamlyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camlyBalance: number;
}

const EXCHANGE_RATE = 10; // 10 DB CAMLY = 1 token CAMLY (tỷ lệ 10:1)
const MIN_CLAIM_AMOUNT = 100000;

export const ClaimCamlyModal = ({ open, onOpenChange, camlyBalance }: ClaimCamlyModalProps) => {
  const { user } = useAuth();
  const { wallets } = useWallets();
  const address = wallets[0]?.address;
  const [amountDb, setAmountDb] = useState("");
  const [loading, setLoading] = useState(false);

  const tokenAmount = amountDb ? Math.floor(parseFloat(amountDb) / EXCHANGE_RATE).toLocaleString() : "0";

  const playCelebrationSound = () => {
    try {
      const audio = new Audio('/sounds/celebration.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Audio play failed:', err));
    } catch (error) {
      console.log('Failed to play celebration sound:', error);
    }
  };


  const handleClaim = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập");
      return;
    }

    if (!address) {
      toast.error("Vui lòng kết nối ví");
      return;
    }

    const amount = parseFloat(amountDb);
    if (isNaN(amount) || amount < MIN_CLAIM_AMOUNT) {
      toast.error(`Số lượng tối thiểu là ${MIN_CLAIM_AMOUNT.toLocaleString()} CAMLY`);
      return;
    }

    if (amount > camlyBalance) {
      toast.error("Số dư không đủ");
      return;
    }

    // Get session token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('claim-camly', {
        body: {
          amountDb: amount,
          walletAddress: address
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // 🎉 Fire floating hearts celebration and play sound!
      triggerFloatingHearts();
      playCelebrationSound();

      toast.success(
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Claim thành công! 🎉</p>
          <p className="text-sm">Bạn đã nhận {data.tokenAmount} CAMLY token</p>
          <a 
            href={`https://bscscan.com/tx/${data.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            Xem giao dịch <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      );

      setAmountDb("");
      onOpenChange(false);
      
      // Reload page to update balance
      setTimeout(() => window.location.reload(), 2000);

    } catch (error: any) {
      console.error('Claim error:', error);
      toast.error(error.message || "Đã xảy ra lỗi khi claim");
    } finally {
      setLoading(false);
    }
  };

  const setMaxAmount = () => {
    setAmountDb(camlyBalance.toString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Claim CAMLY Token
          </DialogTitle>
          <DialogDescription>
            Đổi CAMLY Coin sang token thật trên BNB Chain (10 Camly = 1 Token)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Exchange Rate Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tỷ lệ đổi:</span>
              <span className="font-semibold">10 CAMLY = 1 Token</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">Số dư khả dụng:</span>
              <span className="font-semibold">{camlyBalance.toLocaleString()} CAMLY</span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Số lượng CAMLY muốn đổi</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                placeholder={`Tối thiểu ${MIN_CLAIM_AMOUNT.toLocaleString()}`}
                value={amountDb}
                onChange={(e) => setAmountDb(e.target.value)}
                disabled={loading}
              />
              <Button 
                variant="outline" 
                onClick={setMaxAmount}
                disabled={loading}
              >
                Max
              </Button>
            </div>
          </div>

          {/* Conversion Display */}
          {amountDb && parseFloat(amountDb) >= MIN_CLAIM_AMOUNT && (
            <div className="bg-gradient-to-r from-primary/20 to-yellow-500/20 rounded-lg p-4 border border-primary/30 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-primary">Xem trước giao dịch</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Token thật
                </Badge>
              </div>
              
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="text-center">
                  <p className="text-2xl font-bold">{parseFloat(amountDb).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">CAMLY Coin</p>
                </div>
                <ArrowRight className="w-6 h-6 text-primary animate-bounce" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{tokenAmount}</p>
                  <p className="text-xs text-muted-foreground">CAMLY Token</p>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-primary/20 text-xs text-muted-foreground">
                <p>📍 Token sẽ được gửi đến: <span className="font-mono">{address?.slice(0,6)}...{address?.slice(-4)}</span></p>
              </div>
            </div>
          )}

          {/* Wallet Address */}
          {address && (
            <div className="text-sm">
              <p className="text-muted-foreground">Địa chỉ nhận:</p>
              <p className="font-mono text-xs mt-1 bg-muted p-2 rounded">
                {address}
              </p>
            </div>
          )}

          {/* Claim Button */}
          <Button 
            onClick={handleClaim} 
            disabled={loading || !amountDb || parseFloat(amountDb) < MIN_CLAIM_AMOUNT}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Claim CAMLY Token"
            )}
          </Button>

          {/* Warning */}
          <p className="text-xs text-muted-foreground text-center">
            ⚠️ Giao dịch không thể hoàn tác. Vui lòng kiểm tra kỹ thông tin trước khi claim.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};