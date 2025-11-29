import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: any;
  isSent: boolean;
}

export default function MessageBubble({ message, isSent }: MessageBubbleProps) {
  return (
    <div className={cn("flex gap-2", isSent ? "flex-row-reverse" : "flex-row")}>
      {!isSent && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={message.sender?.avatar_url} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {message.sender?.username?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2",
          isSent
            ? "bg-primary text-primary-foreground"
            : "bg-accent text-accent-foreground"
        )}
      >
        <p className="text-sm break-words">{message.content}</p>
        <p
          className={cn(
            "text-xs mt-1",
            isSent ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {format(new Date(message.created_at), "HH:mm", { locale: vi })}
        </p>
      </div>
    </div>
  );
}
