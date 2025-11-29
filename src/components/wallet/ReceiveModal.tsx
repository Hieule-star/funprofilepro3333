import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supportedChains } from "@/lib/wagmi-config";

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReceiveModal({ isOpen, onClose }: ReceiveModalProps) {
  const { address, chainId } = useWallet();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const currentChain = chainId ? supportedChains[chainId] : null;

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast({
        title: "Đã sao chép",
        description: "Địa chỉ ví đã được sao chép",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nhận {currentChain?.symbol || "Crypto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center p-6 bg-white rounded-lg">
            {address && (
              <QRCodeSVG
                value={address}
                size={200}
                level="H"
                includeMargin={true}
              />
            )}
          </div>

          {/* Network Info */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Quét mã QR hoặc sao chép địa chỉ để nhận
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
              <span className="text-2xl">
                {currentChain?.symbol === "BNB" ? "🟡" : "🔷"}
              </span>
              <span className="text-sm font-semibold">
                {currentChain?.name || "Unknown Network"}
              </span>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <div className="p-3 bg-muted rounded-lg break-all text-center font-mono text-sm">
              {address}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopyAddress}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Đã sao chép
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Sao chép địa chỉ
                </>
              )}
            </Button>
          </div>

          {/* Warning */}
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-xs text-warning-foreground">
              ⚠️ Chỉ gửi {currentChain?.symbol || "token"} trên mạng{" "}
              {currentChain?.name || "này"}. Gửi sai mạng có thể mất tiền!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
