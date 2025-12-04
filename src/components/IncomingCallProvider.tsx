import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCallSignaling } from "@/hooks/useCallSignaling";
import { CallContext } from "@/contexts/CallContext";
import IncomingCallModal from "@/components/chat/IncomingCallModal";
import { useToast } from "@/components/ui/use-toast";

interface IncomingCallProviderProps {
  children: ReactNode;
}

export function IncomingCallProvider({ children }: IncomingCallProviderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const callSignaling = useCallSignaling(user?.id);
  const { incomingCall, acceptCall, rejectCall } = callSignaling;

  // Auto-navigate to chat when accepting call from any page
  const handleAcceptCall = () => {
    if (!incomingCall) return;
    
    console.log('[IncomingCallProvider] Accepting call from:', incomingCall.callerId);
    console.log('[IncomingCallProvider] Call info:', incomingCall);
    
    // Store call info in sessionStorage for Chat.tsx to pick up
    sessionStorage.setItem('pendingCallInfo', JSON.stringify({
      conversationId: incomingCall.conversationId,
      callerName: incomingCall.callerName,
      callerAvatar: incomingCall.callerAvatar
    }));
    
    acceptCall(incomingCall.callerId);
    
    toast({
      title: "Đã chấp nhận cuộc gọi",
      description: "Đang kết nối...",
    });
    
    // Navigate to chat page if not already there
    if (window.location.pathname !== '/chat') {
      console.log('[IncomingCallProvider] Navigating to /chat');
      navigate('/chat');
    }
  };

  const handleRejectCall = () => {
    if (!incomingCall) return;
    
    rejectCall(incomingCall.callerId);
    
    toast({
      title: "Đã từ chối cuộc gọi",
      description: `Bạn đã từ chối cuộc gọi từ ${incomingCall.callerName}`,
    });
  };

  return (
    <CallContext.Provider value={callSignaling}>
      {children}
      
      {/* Global incoming call modal - shows on ANY page */}
      {incomingCall && (
        <IncomingCallModal
          open={true}
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </CallContext.Provider>
  );
}
