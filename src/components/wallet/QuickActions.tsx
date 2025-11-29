import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, QrCode, ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import ReceiveModal from "./ReceiveModal";
import SendModal from "./SendModal";
import SwapModal from "./SwapModal";
import { useWallet } from "@/contexts/WalletContext";

export default function QuickActions() {
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const { isConnected } = useWallet();

  if (!isConnected) {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <Button
              size="lg"
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setIsReceiveOpen(true)}
            >
              <QrCode className="h-6 w-6" />
              <span>Nhận</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setIsSendOpen(true)}
            >
              <Send className="h-6 w-6" />
              <span>Gửi</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => setIsSwapOpen(true)}
            >
              <ArrowLeftRight className="h-6 w-6" />
              <span>Hoán đổi</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <ReceiveModal
        isOpen={isReceiveOpen}
        onClose={() => setIsReceiveOpen(false)}
      />

      <SendModal
        isOpen={isSendOpen}
        onClose={() => setIsSendOpen(false)}
      />

      <SwapModal
        isOpen={isSwapOpen}
        onClose={() => setIsSwapOpen(false)}
      />
    </>
  );
}
