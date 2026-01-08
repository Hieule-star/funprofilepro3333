import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  content: string;
  timestamp: Date;
}

interface LiveChatProps {
  channelName: string;
}

export function LiveChat({ channelName }: LiveChatProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !user || !profile) return;

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: profile.username || 'User',
      avatarUrl: profile.avatar_url || undefined,
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');

    // TODO: Integrate with FUN Chat backend
    // Send message via Supabase Realtime or WebSocket
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Chat Header */}
      <div className="border-b p-3">
        <h3 className="font-semibold">Live Chat</h3>
        <p className="text-xs text-muted-foreground">{messages.length} messages</p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No messages yet. Say hello! 👋
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex gap-2">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={msg.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {msg.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-sm truncate">
                      {msg.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm break-words">{msg.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Say something..."
            disabled={!user}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || !user}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {!user && (
          <p className="text-xs text-muted-foreground mt-2">
            Login to chat
          </p>
        )}
      </div>
    </div>
  );
}
