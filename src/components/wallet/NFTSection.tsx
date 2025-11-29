import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NFTSection() {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-blue-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          NFT Collection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Sparkles className="h-10 w-10 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">NFT sắp ra mắt</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            Quản lý, xem và giao dịch NFT của bạn ngay trên nền tảng
          </p>
          <Button variant="outline" disabled className="gap-2">
            <Sparkles className="h-4 w-4" />
            Coming Soon
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-primary/20 flex items-center justify-center"
            >
              <Image className="h-8 w-8 text-muted-foreground/30" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
