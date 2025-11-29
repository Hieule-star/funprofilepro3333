import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface AddToWatchlistModalProps {
  onAdd: (data: {
    tokenSymbol: string;
    tokenName?: string;
    priceAlertUpper?: number;
    priceAlertLower?: number;
  }) => void;
}

export default function AddToWatchlistModal({ onAdd }: AddToWatchlistModalProps) {
  const [open, setOpen] = useState(false);
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [priceAlertUpper, setPriceAlertUpper] = useState("");
  const [priceAlertLower, setPriceAlertLower] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tokenSymbol.trim()) return;

    onAdd({
      tokenSymbol: tokenSymbol.toUpperCase().trim(),
      tokenName: tokenName.trim() || undefined,
      priceAlertUpper: priceAlertUpper ? parseFloat(priceAlertUpper) : undefined,
      priceAlertLower: priceAlertLower ? parseFloat(priceAlertLower) : undefined,
    });

    // Reset form
    setTokenSymbol("");
    setTokenName("");
    setPriceAlertUpper("");
    setPriceAlertLower("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm token
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm token vào Watchlist</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol Token *</Label>
            <Input
              id="symbol"
              placeholder="BTC, ETH, BNB..."
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Tên Token (tùy chọn)</Label>
            <Input
              id="name"
              placeholder="Bitcoin, Ethereum..."
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="upper">Cảnh báo khi giá cao hơn (USD)</Label>
            <Input
              id="upper"
              type="number"
              step="0.00000001"
              placeholder="0.00"
              value={priceAlertUpper}
              onChange={(e) => setPriceAlertUpper(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lower">Cảnh báo khi giá thấp hơn (USD)</Label>
            <Input
              id="lower"
              type="number"
              step="0.00000001"
              placeholder="0.00"
              value={priceAlertLower}
              onChange={(e) => setPriceAlertLower(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit">Thêm vào Watchlist</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
