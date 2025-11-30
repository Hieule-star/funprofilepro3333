import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Smile, Paperclip } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onTyping?: (isTyping: boolean) => void;
}

export default function ChatInput({ onSendMessage, onTyping }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Trigger typing indicator
    if (onTyping && value.length > 0) {
      onTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 1 second of no input
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1000);
    } else if (onTyping && value.length === 0) {
      onTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
      
      // Stop typing indicator
      if (onTyping) {
        onTyping(false);
      }
      
      // Clear timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-card p-4 flex items-center gap-2"
    >
      <Button type="button" variant="ghost" size="icon">
        <Paperclip className="h-5 w-5" />
      </Button>

      <Input
        value={message}
        onChange={handleChange}
        placeholder="Nhập tin nhắn..."
        className="flex-1"
      />

      <Button type="button" variant="ghost" size="icon">
        <Smile className="h-5 w-5" />
      </Button>

      <Button type="submit" size="icon" disabled={!message.trim()}>
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}
