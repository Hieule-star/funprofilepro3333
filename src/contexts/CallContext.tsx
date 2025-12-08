import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCalls, Call } from "@/hooks/useCalls";
import { usePresence } from "@/hooks/usePresence";
import { useCallSignaling, CallSignalingHook } from "@/hooks/useCallSignaling";

interface CallContextType extends CallSignalingHook {
  // Presence
  isOnline: (userId: string) => boolean;
  onlineCount: number;
  
  // DB Calls (new)
  dbIncomingCall: Call | null;
  dbActiveCall: Call | null;
  callHistory: Call[];
  initiateDbCall: (receiverId: string, callType?: "video" | "audio") => Promise<Call | null>;
  acceptDbCall: (callId: string) => Promise<Call | null>;
  rejectDbCall: (callId: string) => Promise<boolean>;
  endDbCall: (callId: string) => Promise<boolean>;
  fetchCallHistory: () => Promise<void>;
  clearDbIncomingCall: () => void;
  clearDbActiveCall: () => void;
}

export const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // Existing call signaling (Realtime Broadcast)
  const callSignaling = useCallSignaling(user?.id);
  
  // New presence tracking
  const { isOnline, onlineCount } = usePresence(user?.id);
  
  // New DB-based call management
  const {
    incomingCall: dbIncomingCall,
    activeCall: dbActiveCall,
    callHistory,
    initiateCall: initiateDbCall,
    acceptCall: acceptDbCall,
    rejectCall: rejectDbCall,
    endCall: endDbCall,
    fetchCallHistory,
    clearIncomingCall: clearDbIncomingCall,
    clearActiveCall: clearDbActiveCall,
  } = useCalls(user?.id);

  return (
    <CallContext.Provider
      value={{
        // Existing signaling
        ...callSignaling,
        
        // Presence
        isOnline,
        onlineCount,
        
        // DB calls
        dbIncomingCall,
        dbActiveCall,
        callHistory,
        initiateDbCall,
        acceptDbCall,
        rejectDbCall,
        endDbCall,
        fetchCallHistory,
        clearDbIncomingCall,
        clearDbActiveCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
};
