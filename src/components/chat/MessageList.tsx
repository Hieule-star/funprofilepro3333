import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TypingUser {
  userId: string;
  username: string;
  avatarUrl?: string;
}

interface MessageListProps {
  messages: any[];
  currentUserId?: string;
  typingUsers?: TypingUser[];
}

export default function MessageList({ messages, currentUserId, typingUsers = [] }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isSent={message.sender_id === currentUserId}
          />
        ))}
        <TypingIndicator typingUsers={typingUsers} />
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
