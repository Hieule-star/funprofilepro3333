import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ConversationItem from "./ConversationItem";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Settings, MessageCircle, Phone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NewConversationModal from "./NewConversationModal";

interface ChatSidebarProps {
  selectedConversation: any;
  onSelectConversation: (conversation: any) => void;
}

export default function ChatSidebar({
  selectedConversation,
  onSelectConversation,
}: ChatSidebarProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select(`
          conversation_id,
          conversations (
            id,
            created_at,
            updated_at
          )
        `)
        .eq("user_id", user.id);

      if (!error && data) {
        const conversationsWithDetails = await Promise.all(
          data.map(async (item: any) => {
            const { data: participants } = await supabase
              .from("conversation_participants")
              .select(`
                user_id,
                profiles (id, username, avatar_url)
              `)
              .eq("conversation_id", item.conversations.id)
              .neq("user_id", user.id);

            const { data: lastMessage } = await supabase
              .from("messages")
              .select("content, created_at")
              .eq("conversation_id", item.conversations.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            return {
              ...item.conversations,
              participants: participants || [],
              lastMessage,
            };
          })
        );

        setConversations(conversationsWithDetails);
      }
    };

    fetchConversations();

    // Subscribe to real-time conversation updates
    const channel = supabase
      .channel("conversations-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleConversationCreated = async (conversationId: string) => {
    // Fetch the new conversation details
    const { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (conversation) {
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select(`
          user_id,
          profiles (id, username, avatar_url)
        `)
        .eq("conversation_id", conversationId)
        .neq("user_id", user?.id);

      onSelectConversation({
        ...conversation,
        participants: participants || [],
        lastMessage: null,
      });
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.participants.some((p: any) =>
      p.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="w-80 border-r border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary">ChatCall</h2>
          <Button size="icon" variant="ghost">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="messages" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Tin nhắn
            </TabsTrigger>
            <TabsTrigger value="calls" className="gap-2">
              <Phone className="h-4 w-4" />
              Cuộc gọi
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Chưa có cuộc trò chuyện nào</p>
              <p className="text-sm mt-2">Bắt đầu chat với bạn bè của bạn!</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversation?.id === conversation.id}
                onClick={() => onSelectConversation(conversation)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* New Conversation Button */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={() => setShowNewConversationModal(true)}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Cuộc trò chuyện mới
        </Button>
      </div>

      <NewConversationModal
        open={showNewConversationModal}
        onOpenChange={setShowNewConversationModal}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}
