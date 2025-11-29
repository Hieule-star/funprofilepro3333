import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Smile, Paperclip } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (content: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
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
        onChange={(e) => setMessage(e.target.value)}
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
