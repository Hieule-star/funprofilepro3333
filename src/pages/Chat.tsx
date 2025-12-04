import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/contexts/CallContext";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import AgoraVideoCallModal from "@/components/chat/AgoraVideoCallModal";
import DeviceSelectionModal from "@/components/chat/DeviceSelectionModal";
import OutgoingCallModal from "@/components/chat/OutgoingCallModal";
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
  const [deviceSelectionOpen, setDeviceSelectionOpen] = useState(false);
  const [callMode, setCallMode] = useState<'video' | 'audio'>('video');
  const [selectedDevices, setSelectedDevices] = useState<{
    videoDeviceId: string;
    audioDeviceId: string;
  } | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [pendingCallTarget, setPendingCallTarget] = useState<{
    userId: string;
    conversationId: string;
    username: string;
  } | null>(null);
  
  // NEW: State for callee device selection
  const [calleeDeviceModalOpen, setCalleeDeviceModalOpen] = useState(false);
  const [pendingCalleeCall, setPendingCalleeCall] = useState<{
    conversationId: string;
    callerName: string;
  } | null>(null);
  
  // Flags to track if user confirmed device selection (vs cancelled)
  const [callerConfirmedDevices, setCallerConfirmedDevices] = useState(false);
  const [calleeConfirmedDevices, setCalleeConfirmedDevices] = useState(false);
  
  const { typingUsers, setTyping } = useTypingIndicator(
    selectedConversation?.id,
    user?.id
  );

  // Use global call context instead of direct hook
  const {
    initiateCall,
    callAccepted,
    callRejected,
    activeCallAsCallee,
    clearActiveCall
  } = useCall();

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
          console.log("Realtime payload.new:", payload.new);
          
          const newMessageData = payload.new as any;
          
          // Check if message already exists (deduplication)
          const messageExists = messages.some(m => m.id === newMessageData.id);
          if (messageExists) {
            console.log("Message already exists, skipping:", newMessageData.id);
            return;
          }
          
          // Fetch only sender profile info
          const { data: senderData } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .eq("id", newMessageData.sender_id)
            .single();
          
          console.log("Fetched sender data:", senderData);
          
          // Combine payload data with sender info
          const newMessage = {
            ...newMessageData,
            sender: senderData || { 
              id: newMessageData.sender_id, 
              username: "Unknown", 
              avatar_url: "" 
            }
          };
          
          console.log("Final message with sender:", newMessage);
          
          // Add to state with deduplication check
          setMessages((prev) => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) {
              console.log("Duplicate detected during state update, skipping");
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  const handleSendMessage = async (content: string, mediaUrl?: string, mediaType?: string) => {
    if (!selectedConversation || !user) return;
    if (!content.trim() && !mediaUrl) return;

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      content: content.trim() || "",
      media_url: mediaUrl,
      media_type: mediaType,
    });

    if (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Lỗi gửi tin nhắn",
        description: "Không thể gửi tin nhắn. Vui lòng thử lại.",
        variant: "destructive"
      });
    }
  };

  // Handle call acceptance - open video modal for CALLER
  useEffect(() => {
    if (callAccepted) {
      console.log('[Chat] Caller: callAccepted detected, opening VideoCallModal');
      setVideoCallOpen(true);
    }
  }, [callAccepted]);

  // Handle call acceptance - open device selection for CALLEE first
  useEffect(() => {
    if (activeCallAsCallee) {
      console.log('[Chat] Callee: activeCallAsCallee detected, opening DeviceSelectionModal first');
      setIsCaller(false);
      setPendingCalleeCall({
        conversationId: activeCallAsCallee.conversationId,
        callerName: activeCallAsCallee.callerName || "Người gọi"
      });
      setCalleeDeviceModalOpen(true);
    }
  }, [activeCallAsCallee]);

  // Handler for callee device confirmation
  const handleCalleeDeviceConfirm = (devices: { videoDeviceId: string; audioDeviceId: string }) => {
    console.log('[Chat] Callee: Device selection confirmed, opening VideoCallModal');
    setCalleeConfirmedDevices(true); // Set flag BEFORE closing modal
    setSelectedDevices(devices);
    setCalleeDeviceModalOpen(false);
    setVideoCallOpen(true);
  };

  // Handle call rejection
  useEffect(() => {
    if (callRejected) {
      setVideoCallOpen(false);
      setIsCaller(false);
      setPendingCallTarget(null);
      toast({
        title: "Cuộc gọi bị từ chối",
        description: "Người dùng đã từ chối cuộc gọi của bạn",
        variant: "destructive"
      });
    }
  }, [callRejected, toast]);

  // Auto timeout for call (30 seconds)
  useEffect(() => {
    if (isCaller && !callAccepted && !callRejected && pendingCallTarget) {
      const timeout = setTimeout(() => {
        toast({
          title: "Không có phản hồi",
          description: `${pendingCallTarget.username} không phản hồi cuộc gọi`,
          variant: "destructive"
        });
        setIsCaller(false);
        setPendingCallTarget(null);
      }, 30000);
      
      return () => clearTimeout(timeout);
    }
  }, [isCaller, callAccepted, callRejected, pendingCallTarget, toast]);

  // Check permissions before opening device modal
  const checkMediaPermissions = async (mode: 'video' | 'audio'): Promise<boolean> => {
    try {
      // Check microphone permission (required for both modes)
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (micPermission.state === 'denied') {
        toast({
          title: "Quyền microphone bị chặn",
          description: "Vui lòng cho phép truy cập microphone trong cài đặt trình duyệt (click biểu tượng ổ khóa bên cạnh URL)",
          variant: "destructive"
        });
        return false;
      }

      // Check camera permission only for video mode
      if (mode === 'video') {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        
        if (cameraPermission.state === 'denied') {
          toast({
            title: "Quyền camera bị chặn",
            description: "Vui lòng cho phép truy cập camera trong cài đặt trình duyệt (click biểu tượng ổ khóa bên cạnh URL)",
            variant: "destructive"
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      // Permissions API not supported, let the device modal handle it
      console.log('[Chat] Permissions API not supported, proceeding to device selection');
      return true;
    }
  };

  const handleVideoCall = async () => {
    if (!selectedConversation || !profile || !user) return;
    
    // Check permissions first
    const hasPermissions = await checkMediaPermissions('video');
    if (!hasPermissions) return;
    
    setCallMode('video');
    
    // Find the OTHER participant (not the current user)
    const targetUser = selectedConversation.participants.find(
      (p: any) => p.user_id !== user.id
    );
    
    if (!targetUser) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy người dùng để gọi",
        variant: "destructive"
      });
      return;
    }
    
    // Store call target info
    setPendingCallTarget({
      userId: targetUser.user_id,
      conversationId: selectedConversation.id,
      username: targetUser.profiles?.username || "người dùng"
    });
    
    // Open device selection modal
    setDeviceSelectionOpen(true);
  };

  const handleVoiceCall = async () => {
    if (!selectedConversation || !profile || !user) return;
    
    // Check permissions first
    const hasPermissions = await checkMediaPermissions('audio');
    if (!hasPermissions) return;
    
    setCallMode('audio');
    
    // Find the OTHER participant (not the current user)
    const targetUser = selectedConversation.participants.find(
      (p: any) => p.user_id !== user.id
    );
    
    if (!targetUser) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy người dùng để gọi",
        variant: "destructive"
      });
      return;
    }
    
    // Store call target info
    setPendingCallTarget({
      userId: targetUser.user_id,
      conversationId: selectedConversation.id,
      username: targetUser.profiles?.username || "người dùng"
    });
    
    // Open device selection modal (only audio device needed for voice calls)
    setDeviceSelectionOpen(true);
  };

  const handleDeviceConfirm = async (devices: { videoDeviceId: string; audioDeviceId: string }) => {
    if (!pendingCallTarget || !profile) return;

    setCallerConfirmedDevices(true); // Set flag BEFORE closing modal
    setSelectedDevices(devices);
    setDeviceSelectionOpen(false);
    setIsCaller(true);
    
    console.log('Starting call with devices:', devices);
    
    const success = await initiateCall(
      pendingCallTarget.userId,
      pendingCallTarget.conversationId,
      {
        name: profile.username,
        avatar: profile.avatar_url || undefined
      }
    );

    if (!success) {
      toast({
        title: "Không thể kết nối",
        description: "Không thể gửi lời mời cuộc gọi. Vui lòng thử lại sau.",
        variant: "destructive"
      });
      setIsCaller(false);
      setPendingCallTarget(null);
      return;
    }

    toast({
      title: "Đang gọi...",
      description: `Đang chờ ${pendingCallTarget.username} phản hồi...`,
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

      {deviceSelectionOpen && pendingCallTarget && (
        <DeviceSelectionModal
          open={deviceSelectionOpen}
          onOpenChange={(open) => {
            setDeviceSelectionOpen(open);
            if (!open && !callerConfirmedDevices) {
              // Only clear if user CANCELLED, not confirmed
              setPendingCallTarget(null);
            }
            if (!open) {
              setCallerConfirmedDevices(false); // Reset flag
            }
          }}
          onConfirm={handleDeviceConfirm}
          targetUsername={pendingCallTarget.username}
          mode={callMode}
        />
      )}

      {isCaller && pendingCallTarget && !callAccepted && !callRejected && (
        <OutgoingCallModal
          open={true}
          callerName={profile?.username || "Bạn"}
          callerAvatar={profile?.avatar_url}
          targetName={pendingCallTarget.username}
          targetAvatar={selectedConversation?.participants.find(
            p => p.user_id !== user?.id
          )?.profiles?.avatar_url}
          onCancel={() => {
            setIsCaller(false);
            setPendingCallTarget(null);
            toast({
              title: "Đã hủy cuộc gọi",
              description: "Bạn đã hủy cuộc gọi"
            });
          }}
        />
      )}

      {/* Device selection modal for CALLEE */}
      {calleeDeviceModalOpen && pendingCalleeCall && (
        <DeviceSelectionModal
          open={calleeDeviceModalOpen}
          onOpenChange={(open) => {
            setCalleeDeviceModalOpen(open);
            if (!open && !calleeConfirmedDevices) {
              // Only clear if user CANCELLED, not confirmed
              console.log('[Chat] Callee: Modal closed without confirm, clearing call');
              setPendingCalleeCall(null);
              clearActiveCall();
            }
            if (!open) {
              setCalleeConfirmedDevices(false); // Reset flag
            }
          }}
          onConfirm={handleCalleeDeviceConfirm}
          targetUsername={pendingCalleeCall.callerName}
          mode={callMode}
        />
      )}

      {videoCallOpen && (callAccepted || activeCallAsCallee) && selectedDevices && (
        <AgoraVideoCallModal
          open={videoCallOpen}
          onOpenChange={(open) => {
            setVideoCallOpen(open);
            if (!open) {
              setIsCaller(false);
              setSelectedDevices(null);
              setPendingCalleeCall(null);
              clearActiveCall();
            }
          }}
          conversationId={
            isCaller 
              ? selectedConversation?.id || ""
              : pendingCalleeCall?.conversationId || activeCallAsCallee?.conversationId || ""
          }
          targetUsername={
            isCaller
              ? selectedConversation?.participants.find((p: any) => p.user_id !== user?.id)?.profiles?.username || ""
              : pendingCalleeCall?.callerName || "Người gọi"
          }
          mode={callMode}
          selectedVideoDeviceId={selectedDevices.videoDeviceId}
          selectedAudioDeviceId={selectedDevices.audioDeviceId}
        />
      )}
    </div>
  );
}
