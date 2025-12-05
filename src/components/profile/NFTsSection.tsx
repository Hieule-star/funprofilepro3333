import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NFT {
  id: string;
  name: string;
  image_url: string;
  collection?: string;
  token_id?: string;
}

interface NFTsSectionProps {
  nfts?: NFT[];
  walletAddress?: string;
}

export function NFTsSection({ nfts = [], walletAddress }: NFTsSectionProps) {
  const openInOpenSea = () => {
    if (!walletAddress) return;
    window.open(`https://opensea.io/${walletAddress}`, "_blank");
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          NFT Collection
        </CardTitle>
        {walletAddress && (
          <Button variant="outline" size="sm" onClick={openInOpenSea}>
            <ExternalLink className="h-4 w-4 mr-2" />
            OpenSea
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {nfts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {nfts.map((nft) => (
              <div
                key={nft.id}
                className="relative group overflow-hidden rounded-lg border bg-muted aspect-square"
              >
                <img
                  src={nft.image_url}
                  alt={nft.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <div className="text-white">
                    <p className="font-medium text-sm truncate">{nft.name}</p>
                    {nft.collection && (
                      <p className="text-xs text-white/70">{nft.collection}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="p-4 rounded-full bg-muted w-fit mx-auto mb-4">
              <Image className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">Chưa có NFT nào</p>
            <p className="text-xs text-muted-foreground">
              NFT sẽ hiển thị khi bạn sở hữu trên blockchain
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
