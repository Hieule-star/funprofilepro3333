import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Share2, MoreVertical, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import CommentList from "@/components/CommentList";
import CommentInput from "@/components/CommentInput";
import { useNavigate } from "react-router-dom";
import { MediaStatusBadge, MediaStatusIndicator, PinStatus } from "@/components/ui/MediaStatusBadge";
import { useMediaUpload, MediaAsset } from "@/hooks/useMediaUpload";

interface MediaItem {
  type: "image" | "video";
  url: string;
  mediaAssetId?: string;
  pinStatus?: PinStatus;
  ipfsCid?: string | null;
  ipfsGatewayUrl?: string | null;
}

interface PostProps {
  postId?: string;
  userId?: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: Date;
  likes: number;
  comments: number;
  shares: number;
  media?: MediaItem[];
  autoExpandComments?: boolean;
  targetCommentId?: string | null;
}

export default function Post({
  postId,
  userId,
  author,
  avatar,
  content,
  timestamp,
  likes: initialLikes,
  comments,
  shares,
  media,
  autoExpandComments = false,
  targetCommentId = null,
}: PostProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { retryPin, getMediaByPostId } = useMediaUpload();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [commentsCount, setCommentsCount] = useState(comments);
  const [showComments, setShowComments] = useState(false);
  const [replyTo, setReplyTo] = useState<{ commentId: string; username: string } | null>(null);
  const [mediaWithStatus, setMediaWithStatus] = useState<MediaItem[]>(media || []);

  // Fetch media assets with IPFS status for this post
  useEffect(() => {
    const fetchMediaStatus = async () => {
      if (!postId) return;
      
      const mediaAssets = await getMediaByPostId(postId);
      if (mediaAssets.length > 0) {
        // Merge media assets with existing media
        const updatedMedia = (media || []).map(m => {
          const asset = mediaAssets.find(a => a.r2_url === m.url);
          if (asset) {
            return {
              ...m,
              mediaAssetId: asset.id,
              pinStatus: asset.pin_status,
              ipfsCid: asset.ipfs_cid,
              ipfsGatewayUrl: asset.ipfs_gateway_url,
            };
          }
          return m;
        });
        setMediaWithStatus(updatedMedia);
      }
    };
    
    fetchMediaStatus();
  }, [postId, media]);

  // Subscribe to media_assets changes for IPFS status updates
  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`media-status-${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media_assets',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          const updated = payload.new as MediaAsset;
          setMediaWithStatus(prev => prev.map(m => {
            if (m.mediaAssetId === updated.id) {
              return {
                ...m,
                pinStatus: updated.pin_status,
                ipfsCid: updated.ipfs_cid,
                ipfsGatewayUrl: updated.ipfs_gateway_url,
              };
            }
            return m;
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  useEffect(() => {
    if (postId && user) {
      checkIfLiked();
      fetchLikesCount();
      fetchCommentsCount();
    }
  }, [postId, user]);

  useEffect(() => {
    if (!postId) return;

    // Real-time subscription for comments count
    const channel = supabase
      .channel(`post-comments-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchCommentsCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  // Auto-expand comments when coming from notification
  useEffect(() => {
    if (autoExpandComments) {
      setShowComments(true);
    }
  }, [autoExpandComments]);

  const checkIfLiked = async () => {
    if (!postId || !user) return;

    const { data } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .single();

    setLiked(!!data);
  };

  const fetchLikesCount = async () => {
    if (!postId) return;

    const { count } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    setLikesCount(count || 0);
  };

  const fetchCommentsCount = async () => {
    if (!postId) return;

    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    setCommentsCount(count || 0);
  };

  const handleLike = async () => {
    if (!postId || !user) {
      toast({
        title: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập để thích bài viết",
        variant: "destructive",
      });
      return;
    }

    try {
      if (liked) {
        // Unlike
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        
        setLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Like
        await supabase
          .from("post_likes")
          .insert({
            post_id: postId,
            user_id: user.id,
          });
        
        setLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: "Lỗi",
        description: "Không thể thực hiện thao tác",
        variant: "destructive",
      });
    }
  };

  const handleRetryPin = async (mediaAssetId: string) => {
    const success = await retryPin(mediaAssetId);
    if (success) {
      toast({
        title: "Đang thử lại",
        description: "IPFS pinning đang được xử lý lại",
      });
    } else {
      toast({
        title: "Lỗi",
        description: "Không thể thử lại IPFS pinning",
        variant: "destructive",
      });
    }
  };

  const renderMedia = () => {
    if (!mediaWithStatus || mediaWithStatus.length === 0) return null;

    const gridClass =
      mediaWithStatus.length === 1
        ? "grid-cols-1"
        : mediaWithStatus.length === 2
        ? "grid-cols-2"
        : mediaWithStatus.length === 3
        ? "grid-cols-3"
        : "grid-cols-2";

    return (
      <div className={`grid gap-2 ${gridClass} mt-3`}>
        {mediaWithStatus.map((item, index) => (
          <div
            key={index}
            className="group relative overflow-hidden rounded-lg bg-muted"
          >
            {item.type === "image" ? (
              <img
                src={item.url}
                alt={`Media ${index + 1}`}
                className="w-full h-auto object-contain transition-transform hover:scale-105"
              />
            ) : (
              <video
                src={item.url}
                className="w-full h-auto object-contain"
                controls
              />
            )}
            
            {/* IPFS Status Indicator */}
            {item.pinStatus && (
              <div className="absolute left-2 top-2 opacity-70 group-hover:opacity-100 transition-opacity">
                <MediaStatusIndicator pinStatus={item.pinStatus} />
              </div>
            )}
            
            {/* IPFS Status Badge on hover */}
            {item.pinStatus && item.mediaAssetId && (
              <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <MediaStatusBadge
                  pinStatus={item.pinStatus}
                  ipfsCid={item.ipfsCid}
                  ipfsGatewayUrl={item.ipfsGatewayUrl}
                  onRetry={item.pinStatus === 'failed' 
                    ? () => handleRetryPin(item.mediaAssetId!)
                    : undefined
                  }
                  size="sm"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleProfileClick = () => {
    if (!userId) return;
    
    if (userId === user?.id) {
      navigate('/profile');
    } else {
      navigate(`/user/${userId}`);
    }
  };

  return (
    <Card 
      id={postId ? `post-${postId}` : undefined}
      className={`shadow-md transition-all hover:shadow-lg ${
        autoExpandComments ? 'ring-2 ring-primary' : ''
      }`}
    >
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleProfileClick}
        >
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {avatar}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold hover:underline">{author}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(timestamp, { addSuffix: true, locale: vi })}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        {renderMedia()}
      </CardContent>
      <CardFooter className="flex-col items-start pt-3">
        <div className="flex w-full items-center justify-between border-b pb-3">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 transition-colors ${
                liked ? "text-destructive" : "hover:text-destructive"
              }`}
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              <span className="text-xs">{likesCount}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 hover:text-info"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs">{commentsCount}</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 hover:text-primary">
              <Share2 className="h-4 w-4" />
              <span className="text-xs">{shares}</span>
            </Button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && postId && (
          <div className="w-full pt-4 space-y-4">
            <CommentList 
              postId={postId} 
              onReply={(commentId, username) => setReplyTo({ commentId, username })}
              targetCommentId={targetCommentId}
            />
            <CommentInput 
              postId={postId} 
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
            />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
