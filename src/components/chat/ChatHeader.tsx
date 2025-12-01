import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  conversation: any;
  onVideoCall?: () => void;
  onVoiceCall?: () => void;
}

export default function ChatHeader({ conversation, onVideoCall, onVoiceCall }: ChatHeaderProps) {
  const otherUser = conversation.participants[0]?.profiles;

  return (
    <div className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11">
          <AvatarImage src={otherUser?.avatar_url} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {otherUser?.username?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-base">{otherUser?.username || "Người dùng"}</h3>
          <p className="text-xs text-primary font-medium">Đang Hoạt Động</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onVoiceCall} className="text-primary hover:text-primary hover:bg-primary/10">
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onVideoCall} className="text-primary hover:text-primary hover:bg-primary/10">
          <Video className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-primary hover:text-primary hover:bg-primary/10">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
