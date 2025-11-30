import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import VideoCallModal from "@/components/chat/VideoCallModal";
import IncomingCallModal from "@/components/chat/IncomingCallModal";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

export default function Chat() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [incomingCallOpen, setIncomingCallOpen] = useState(false);
  const [callInitiator, setCallInitiator] = useState<string>("");
  const [isCaller, setIsCaller] = useState(false);
  
  const { typingUsers, setTyping } = useTypingIndicator(
    selectedConversation?.id,
    user?.id
  );

  useEffect(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles(id, username, avatar_url)
        `)
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
      setLoading(false);
    };

    fetchMessages();

    const channel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        async (payload) => {
          const { data: newMessage } = await supabase
            .from("messages")
            .select(`
              *,
              sender:profiles(id, username, avatar_url)
            `)
            .eq("id", payload.new.id)
            .single();

          if (newMessage) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation || !user || !content.trim()) return;

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      content: content.trim(),
    });

    if (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleVideoCall = () => {
    if (!selectedConversation) return;
    setIsCaller(true);
    setVideoCallOpen(true);
    toast({
      title: "Đang gọi...",
      description: `Đang kết nối với ${selectedConversation.participants[0]?.profiles?.username}`,
    });
  };

  const handleVoiceCall = () => {
    if (!selectedConversation) return;
    setIsCaller(true);
    setVideoCallOpen(true);
    toast({
      title: "Đang gọi...",
      description: `Đang kết nối với ${selectedConversation.participants[0]?.profiles?.username}`,
    });
  };

  const handleAcceptCall = () => {
    setIncomingCallOpen(false);
    setIsCaller(false);
    setVideoCallOpen(true);
  };

  const handleRejectCall = () => {
    setIncomingCallOpen(false);
    toast({
      title: "Đã từ chối cuộc gọi",
    });
  };

  const handleTyping = (isTyping: boolean) => {
    if (profile) {
      setTyping(isTyping, profile.username, profile.avatar_url || undefined);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      <ChatSidebar
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
      />

      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <ChatHeader 
              conversation={selectedConversation}
              onVideoCall={handleVideoCall}
              onVoiceCall={handleVoiceCall}
            />
            
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <MessageList 
                messages={messages} 
                currentUserId={user?.id}
                typingUsers={typingUsers}
              />
            )}

            <ChatInput 
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Chào mừng đến với Chat</h3>
              <p>Chọn một cuộc trò chuyện để bắt đầu</p>
            </div>
          </div>
        )}
      </div>

      {selectedConversation && (
        <>
          <VideoCallModal
            open={videoCallOpen}
            onOpenChange={setVideoCallOpen}
            currentUserId={user?.id || ""}
            targetUserId={selectedConversation.participants[0]?.user_id || ""}
            targetUsername={selectedConversation.participants[0]?.profiles?.username || ""}
            conversationId={selectedConversation.id}
            isCaller={isCaller}
          />

          <IncomingCallModal
            open={incomingCallOpen}
            callerName={selectedConversation.participants[0]?.profiles?.username || ""}
            callerAvatar={selectedConversation.participants[0]?.profiles?.avatar_url}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />
        </>
      )}
    </div>
  );
}
