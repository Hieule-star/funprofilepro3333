import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Copy, ExternalLink, Coins, CheckCircle2 } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface Web3SectionProps {
  camlyBalance: number;
  onClaimClick: () => void;
}

export function Web3Section({ camlyBalance, onClaimClick }: Web3SectionProps) {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const shortenAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast({
      title: "Đã sao chép",
      description: "Địa chỉ ví đã được sao chép vào clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const openInExplorer = () => {
    if (!address) return;
    window.open(`https://bscscan.com/address/${address}`, "_blank");
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Web3 Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wallet Address */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Địa chỉ ví</p>
          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm">
                {shortenAddress(address)}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={copyAddress}
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={openInExplorer}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">Chưa kết nối ví</p>
          )}
        </div>

        {/* CAMLY Balance */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning/20">
                <Coins className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CAMLY Balance</p>
                <p className="text-2xl font-bold">{camlyBalance.toLocaleString()}</p>
              </div>
            </div>
            <Button
              onClick={onClaimClick}
              disabled={camlyBalance < 100000}
              className="gap-2"
            >
              <Coins className="h-4 w-4" />
              Claim
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Tối thiểu 100,000 CAMLY để claim. Tỷ lệ: 10 CAMLY = 1 Token
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" asChild>
            <a href="/wallet">
              <Wallet className="h-4 w-4 mr-2" />
              Quản lý Ví
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
