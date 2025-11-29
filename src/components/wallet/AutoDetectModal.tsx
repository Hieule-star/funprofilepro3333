import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface DetectedToken {
  contract_address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  logo_url: string | null;
  verified: boolean;
  coingecko_id?: string;
}

interface AutoDetectModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: DetectedToken[];
  isLoading: boolean;
  onAddSelected: (selectedTokens: DetectedToken[]) => void;
}

export default function AutoDetectModal({
  isOpen,
  onClose,
  tokens,
  isLoading,
  onAddSelected,
}: AutoDetectModalProps) {
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());

  const handleToggleToken = (contractAddress: string) => {
    setSelectedTokens((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contractAddress)) {
        newSet.delete(contractAddress);
      } else {
        newSet.add(contractAddress);
      }
      return newSet;
    });
  };

  const handleAddSelected = () => {
    const tokensToAdd = tokens.filter((token) =>
      selectedTokens.has(token.contract_address)
    );
    onAddSelected(tokensToAdd);
    setSelectedTokens(new Set());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang tìm kiếm tokens...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                Tìm thấy {tokens.length} tokens trong ví
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p>Đang quét blockchain và xác thực với CoinGecko...</p>
                </div>
              </CardContent>
            </Card>
          ) : tokens.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Không tìm thấy token nào được list trên CoinGecko trong ví của bạn.
                </p>
              </CardContent>
            </Card>
          ) : (
            tokens.map((token) => (
              <Card
                key={token.contract_address}
                className={`cursor-pointer transition-colors ${
                  selectedTokens.has(token.contract_address)
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => handleToggleToken(token.contract_address)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedTokens.has(token.contract_address)}
                      onCheckedChange={() => handleToggleToken(token.contract_address)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <Avatar className="h-10 w-10">
                      {token.logo_url ? (
                        <AvatarImage src={token.logo_url} alt={token.symbol} />
                      ) : (
                        <AvatarFallback>{token.symbol.slice(0, 2)}</AvatarFallback>
                      )}
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{token.symbol}</p>
                        {token.verified && (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{token.name}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">{token.balance}</p>
                      <p className="text-sm text-muted-foreground">{token.symbol}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          {!isLoading && tokens.length > 0 && (
            <Button
              onClick={handleAddSelected}
              disabled={selectedTokens.size === 0}
            >
              Thêm đã chọn ({selectedTokens.size})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
