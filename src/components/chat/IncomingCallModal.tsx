import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff } from "lucide-react";

interface IncomingCallModalProps {
  open: boolean;
  callerName: string;
  callerAvatar?: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  open,
  callerName,
  callerAvatar,
  onAccept,
  onReject
}: IncomingCallModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onReject()}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center gap-6 py-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={callerAvatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {callerName?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">{callerName}</h3>
            <p className="text-muted-foreground">đang gọi cho bạn...</p>
          </div>

          <div className="flex gap-4">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full h-16 w-16"
              onClick={onReject}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            <Button
              variant="default"
              size="lg"
              className="rounded-full h-16 w-16 bg-green-600 hover:bg-green-700"
              onClick={onAccept}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}