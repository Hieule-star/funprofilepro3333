import { createContext, useContext } from "react";
import { CallSignalingHook } from "@/hooks/useCallSignaling";

export const CallContext = createContext<CallSignalingHook | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within IncomingCallProvider');
  }
  return context;
};
