import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      <Avatar className="h-12 w-12">
        <AvatarImage src={otherUser?.avatar_url} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {otherUser?.username?.[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold truncate">
            {otherUser?.username || "Người dùng"}
          </h3>
          {lastMessage && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(lastMessage.created_at), {
                addSuffix: true,
                locale: vi,
              })}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {lastMessage?.content || "Bắt đầu cuộc trò chuyện"}
        </p>
      </div>
    </div>
  );
}
