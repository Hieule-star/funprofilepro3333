import { useRewardNotifications } from "@/hooks/useRewardNotifications";

export const RewardNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  useRewardNotifications();
  return <>{children}</>;
};
