import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SocialLinks } from "./SocialLinks";
import { FollowButton } from "./FollowButton";
import { 
  MapPin, 
  Briefcase, 
  Settings, 
  MessageCircle, 
  Camera,
  Award,
  TrendingUp,
  Shield,
  UserPlus,
  UserCheck,
  Clock
} from "lucide-react";
import { useFollowers } from "@/hooks/useFollowers";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileData {
  id: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
  job_title?: string;
  location?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_tiktok?: string;
  social_twitter?: string;
  social_website?: string;
  badges?: any[];
  reputation_score?: number;
}

interface ProfileHeaderProps {
  profile: ProfileData;
  isOwnProfile: boolean;
  postsCount: number;
  friendsCount: number;
  onEditClick: () => void;
  onCoverEditClick?: () => void;
}

export function ProfileHeader({
  profile,
  isOwnProfile,
  postsCount,
  friendsCount,
  onEditClick,
  onCoverEditClick,
}: ProfileHeaderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { followersCount, followingCount, isFollowing, actionLoading, toggleFollow } = useFollowers({
    userId: profile.id,
  });

  // Friendship state
  const [friendshipStatus, setFriendshipStatus] = useState<"none" | "pending_sent" | "pending_received" | "accepted">("none");
  const [friendLoading, setFriendLoading] = useState(false);
  const [mutualFriends, setMutualFriends] = useState<{ id: string; username: string; avatar_url: string | null }[]>([]);

  // Fetch friendship status and mutual friends
  useEffect(() => {
    const fetchFriendshipData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id === profile.id) return;

      // Check if they sent request to me
      const { data: receivedRequest } = await supabase
        .from("friendships")
        .select("status")
        .eq("user_id", profile.id)
        .eq("friend_id", user.id)
        .maybeSingle();

      if (receivedRequest) {
        setFriendshipStatus(receivedRequest.status === "accepted" ? "accepted" : "pending_received");
      } else {
        // Check if I sent request to them
        const { data: sentRequest } = await supabase
          .from("friendships")
          .select("status")
          .eq("user_id", user.id)
          .eq("friend_id", profile.id)
          .maybeSingle();

        if (sentRequest) {
          setFriendshipStatus(sentRequest.status === "accepted" ? "accepted" : "pending_sent");
        } else {
          setFriendshipStatus("none");
        }
      }

      // Fetch mutual friends
      // Get my friends
      const { data: myFriendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      // Get their friends
      const { data: theirFriendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
        .eq("status", "accepted");

      if (myFriendships && theirFriendships) {
        // Extract friend IDs for me
        const myFriendIds = myFriendships.map(f => 
          f.user_id === user.id ? f.friend_id : f.user_id
        );

        // Extract friend IDs for them
        const theirFriendIds = theirFriendships.map(f => 
          f.user_id === profile.id ? f.friend_id : f.user_id
        );

        // Find common friends (excluding me and the profile owner)
        const mutualIds = myFriendIds.filter(id => 
          theirFriendIds.includes(id) && id !== user.id && id !== profile.id
        );

        if (mutualIds.length > 0) {
          const { data: mutualProfiles } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", mutualIds)
            .limit(5);

          if (mutualProfiles) {
            setMutualFriends(mutualProfiles);
          }
        }
      }
    };

    fetchFriendshipData();
  }, [profile.id]);

  const handleSendFriendRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setFriendLoading(true);
    const { error } = await supabase
      .from("friendships")
      .insert({ user_id: user.id, friend_id: profile.id, status: "pending" });

    if (!error) {
      setFriendshipStatus("pending_sent");
      toast({ title: "Đã gửi lời mời kết bạn" });
    }
    setFriendLoading(false);
  };

  const handleCancelFriendRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setFriendLoading(true);
    await supabase
      .from("friendships")
      .delete()
      .eq("user_id", user.id)
      .eq("friend_id", profile.id);

    setFriendshipStatus("none");
    toast({ title: "Đã hủy lời mời kết bạn" });
    setFriendLoading(false);
  };

  const handleAcceptFriendRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setFriendLoading(true);
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("user_id", profile.id)
      .eq("friend_id", user.id);

    setFriendshipStatus("accepted");
    toast({ title: "Đã chấp nhận lời mời kết bạn" });
    setFriendLoading(false);
  };

  const handleUnfriend = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const confirmed = window.confirm("Bạn có chắc muốn hủy kết bạn?");
    if (!confirmed) return;

    setFriendLoading(true);
    
    // Delete friendship in both directions
    await supabase
      .from("friendships")
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${user.id})`);

    setFriendshipStatus("none");
    toast({ title: "Đã hủy kết bạn" });
    setFriendLoading(false);
  };

  const getAvatarFallback = () => {
    if (profile.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getLevel = (score: number = 0) => {
    if (score >= 10000) return { level: 5, name: "Master" };
    if (score >= 5000) return { level: 4, name: "Expert" };
    if (score >= 2000) return { level: 3, name: "Pro" };
    if (score >= 500) return { level: 2, name: "Rising" };
    return { level: 1, name: "Newbie" };
  };

  const levelInfo = getLevel(profile.reputation_score);

  const handleMessageClick = () => {
    navigate(`/chat?userId=${profile.id}`);
  };

  return (
    <Card className="overflow-hidden border-primary/20">
      {/* Cover Image */}
      <div className="relative h-48 sm:h-64 w-full bg-gradient-hero">
        {profile.cover_url && (
          <img
            src={profile.cover_url}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        {isOwnProfile && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-4 right-4 gap-2 bg-background/80 backdrop-blur-sm"
            onClick={onCoverEditClick}
          >
            <Camera className="h-4 w-4" />
            Đổi ảnh bìa
          </Button>
        )}
      </div>

      <CardContent className="relative pt-0">
        {/* Avatar */}
        <div className="relative -mt-16 sm:-mt-20 mb-4">
          <Avatar className="h-28 w-28 sm:h-36 sm:w-36 border-4 border-card shadow-lg">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="bg-primary/10 text-primary text-3xl sm:text-4xl font-bold">
              {getAvatarFallback()}
            </AvatarFallback>
          </Avatar>
          {isOwnProfile && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md"
              onClick={onEditClick}
            >
              <Camera className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3 flex-1">
            {/* Name and Level Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">
                {profile.username || "Người dùng"}
              </h1>
              <Badge variant="outline" className="gap-1 border-primary/50">
                <Shield className="h-3 w-3 text-primary" />
                Lv.{levelInfo.level} {levelInfo.name}
              </Badge>
            </div>

            {/* Handle, Job, Location */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>@{profile.username || "username"}</span>
              {profile.job_title && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {profile.job_title}
                  </span>
                </>
              )}
              {profile.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {profile.location}
                  </span>
                </>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm sm:text-base max-w-2xl">{profile.bio}</p>
            )}

            {/* Social Links */}
            <SocialLinks
              facebook={profile.social_facebook}
              instagram={profile.social_instagram}
              tiktok={profile.social_tiktok}
              twitter={profile.social_twitter}
              website={profile.social_website}
            />

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Award className="h-3 w-3" />
                Thành viên
              </Badge>
              {postsCount > 10 && (
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Hoạt động tích cực
                </Badge>
              )}
              {(profile.badges || []).map((badge: any, index: number) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {badge.icon && <span>{badge.icon}</span>}
                  {badge.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isOwnProfile ? (
              <Button className="gap-2" onClick={onEditClick}>
                <Settings className="h-4 w-4" />
                Chỉnh sửa
              </Button>
            ) : (
              <>
                {/* Friend Button */}
                {friendshipStatus === "none" && (
                  <Button className="gap-2" onClick={handleSendFriendRequest} disabled={friendLoading}>
                    <UserPlus className="h-4 w-4" />
                    Kết bạn
                  </Button>
                )}
                {friendshipStatus === "pending_sent" && (
                  <Button variant="outline" className="gap-2" onClick={handleCancelFriendRequest} disabled={friendLoading}>
                    <Clock className="h-4 w-4" />
                    Đã gửi
                  </Button>
                )}
                {friendshipStatus === "pending_received" && (
                  <Button className="gap-2" onClick={handleAcceptFriendRequest} disabled={friendLoading}>
                    <UserCheck className="h-4 w-4" />
                    Chấp nhận
                  </Button>
                )}
                {friendshipStatus === "accepted" && (
                  <Button variant="secondary" className="gap-2" onClick={handleUnfriend} disabled={friendLoading}>
                    <UserCheck className="h-4 w-4" />
                    Bạn bè
                  </Button>
                )}
                
                <FollowButton
                  isFollowing={isFollowing}
                  loading={actionLoading}
                  onClick={toggleFollow}
                />
                <Button variant="outline" className="gap-2" onClick={handleMessageClick}>
                  <MessageCircle className="h-4 w-4" />
                  Nhắn tin
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mutual Friends Section - Only show on other's profile */}
        {!isOwnProfile && mutualFriends.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              {mutualFriends.length} bạn chung
            </p>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {mutualFriends.slice(0, 5).map((friend) => (
                  <Avatar 
                    key={friend.id} 
                    className="h-8 w-8 border-2 border-card cursor-pointer hover:z-10 transition-transform hover:scale-110"
                    onClick={() => navigate(`/user/${friend.id}`)}
                  >
                    {friend.avatar_url && <AvatarImage src={friend.avatar_url} />}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {friend.username?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {mutualFriends.map(f => f.username).slice(0, 2).join(", ")}
                {mutualFriends.length > 2 && ` và ${mutualFriends.length - 2} người khác`}
              </span>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-6 mt-6 pt-6 border-t text-sm">
          <div className="text-center">
            <p className="font-bold text-lg">{followersCount}</p>
            <p className="text-muted-foreground">Người theo dõi</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{followingCount}</p>
            <p className="text-muted-foreground">Đang theo dõi</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{postsCount}</p>
            <p className="text-muted-foreground">Bài viết</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{friendsCount}</p>
            <p className="text-muted-foreground">Bạn bè</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
