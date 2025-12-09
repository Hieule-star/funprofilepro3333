import { useFriendRequestNotifications } from "@/hooks/useFriendRequestNotifications";

export function FriendRequestNotificationProvider({ children }: { children: React.ReactNode }) {
  useFriendRequestNotifications();
  return <>{children}</>;
}
