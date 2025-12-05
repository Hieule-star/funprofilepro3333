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
  Shield
} from "lucide-react";
import { useFollowers } from "@/hooks/useFollowers";
import { useNavigate } from "react-router-dom";

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
  const { followersCount, followingCount, isFollowing, actionLoading, toggleFollow } = useFollowers({
    userId: profile.id,
  });

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
    // Navigate to chat with this user
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
          <div className="flex items-center gap-2">
            {isOwnProfile ? (
              <Button className="gap-2" onClick={onEditClick}>
                <Settings className="h-4 w-4" />
                Chỉnh sửa
              </Button>
            ) : (
              <>
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
