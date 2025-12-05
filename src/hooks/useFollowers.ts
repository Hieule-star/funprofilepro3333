import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface UseFollowersOptions {
  userId: string;
}

export function useFollowers({ userId }: UseFollowersOptions) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFollowData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Count followers (people following this user)
      const { count: followers } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId);

      // Count following (people this user follows)
      const { count: following } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId);

      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);

      // Check if current user is following this user
      if (user && user.id !== userId) {
        const { data: followData } = await supabase
          .from("followers")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", userId)
          .single();

        setIsFollowing(!!followData);
      }
    } catch (error) {
      console.error("Error fetching follow data:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, user]);

  useEffect(() => {
    fetchFollowData();
  }, [fetchFollowData]);

  const handleFollow = async () => {
    if (!user) {
      toast({
        title: "Thông báo",
        description: "Vui lòng đăng nhập để theo dõi",
        variant: "destructive",
      });
      return;
    }

    if (user.id === userId) {
      return;
    }

    try {
      setActionLoading(true);

      const { error } = await supabase.from("followers").insert({
        follower_id: user.id,
        following_id: userId,
      });

      if (error) throw error;

      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);

      toast({
        title: "Thành công",
        description: "Đã theo dõi người dùng",
      });
    } catch (error) {
      console.error("Error following user:", error);
      toast({
        title: "Lỗi",
        description: "Không thể theo dõi người dùng",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!user || user.id === userId) return;

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);

      if (error) throw error;

      setIsFollowing(false);
      setFollowersCount((prev) => Math.max(0, prev - 1));

      toast({
        title: "Thành công",
        description: "Đã bỏ theo dõi người dùng",
      });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast({
        title: "Lỗi",
        description: "Không thể bỏ theo dõi",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleFollow = () => {
    if (isFollowing) {
      handleUnfollow();
    } else {
      handleFollow();
    }
  };

  return {
    followersCount,
    followingCount,
    isFollowing,
    loading,
    actionLoading,
    toggleFollow,
    refetch: fetchFollowData,
  };
}
