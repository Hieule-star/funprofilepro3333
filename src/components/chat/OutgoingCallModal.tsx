import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhoneOff } from "lucide-react";

interface OutgoingCallModalProps {
  open: boolean;
  callerName: string;
  callerAvatar?: string;
  targetName: string;
  targetAvatar?: string;
  onCancel: () => void;
}

export default function OutgoingCallModal({
  open,
  callerName,
  targetName,
  targetAvatar,
  onCancel
}: OutgoingCallModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center gap-6 py-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={targetAvatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {targetName?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">
              {callerName} đang gọi {targetName}
            </h3>
            <p className="text-muted-foreground animate-pulse">
              Đang chờ phản hồi...
            </p>
          </div>

          <Button
            variant="destructive"
            size="lg"
            className="rounded-full px-8"
            onClick={onCancel}
          >
            <PhoneOff className="h-6 w-6 mr-2" />
            Dừng cuộc gọi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
