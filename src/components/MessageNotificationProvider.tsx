import { useMessageNotifications } from "@/hooks/useMessageNotifications";

export const MessageNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  useMessageNotifications();
  return <>{children}</>;
};
