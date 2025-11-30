import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TypingUser {
  userId: string;
  username: string;
  avatarUrl?: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

export default function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].username} đang nhập...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].username} và ${typingUsers[1].username} đang nhập...`;
    } else {
      return `${typingUsers.length} người đang nhập...`;
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex -space-x-2">
        {typingUsers.slice(0, 3).map((user) => (
          <Avatar key={user.userId} className="h-6 w-6 border-2 border-background">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <span className="animate-pulse">{getTypingText()}</span>
      <div className="flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
          •
        </span>
        <span className="animate-bounce" style={{ animationDelay: "150ms" }}>
          •
        </span>
        <span className="animate-bounce" style={{ animationDelay: "300ms" }}>
          •
        </span>
      </div>
    </div>
  );
}
