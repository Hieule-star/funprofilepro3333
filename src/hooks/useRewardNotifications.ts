import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useRewardNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("reward-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reward_transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const transaction = payload.new as any;
          
          // Don't show notification for initial calculation
          if (transaction.reward_type === "initial_calculation") {
            return;
          }

          // Format amount with thousand separators
          const formattedAmount = transaction.amount.toLocaleString("en-US");
          
          // Get emoji based on reward type
          const getEmoji = (type: string) => {
            switch (type) {
              case "registration":
                return "🎉";
              case "post":
                return "📝";
              case "comment":
                return "💬";
              case "like":
                return "❤️";
              case "friend":
                return "👥";
              case "game":
                return "🎮";
              case "daily_checkin":
                return "📅";
              default:
                return "🎁";
            }
          };

          toast.success(`${getEmoji(transaction.reward_type)} +${formattedAmount} CAMLY`, {
            description: transaction.description,
            duration: 4000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
};
