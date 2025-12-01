import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  conversation: any;
  isSelected: boolean;
  onClick: () => void;
}

export default function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: ConversationItemProps) {
  const otherUser = conversation.participants[0]?.profiles;
  const lastMessage = conversation.lastMessage;
  
  // Mock online status and unread count (you can connect to real data later)
  const isOnline = Math.random() > 0.5;
  const unreadCount = Math.floor(Math.random() * 3);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
        isSelected 
          ? "bg-primary/10 border-l-4 border-primary" 
          : "hover:bg-muted/50"
      )}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={otherUser?.avatar_url} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {otherUser?.username?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 bg-primary border-2 border-card rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold truncate">
            {otherUser?.username || "Người dùng"}
          </h3>
          <div className="flex items-center gap-2">
            {lastMessage && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(lastMessage.created_at), {
                  addSuffix: false,
                  locale: vi,
                })}
              </span>
            )}
            {unreadCount > 0 && (
              <Badge className="h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary text-primary-foreground rounded-full">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {lastMessage?.content || "Bắt đầu cuộc trò chuyện"}
        </p>
      </div>
    </div>
  );
}
