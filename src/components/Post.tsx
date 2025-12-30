import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import CommentList from "@/components/CommentList";
import CommentInput from "@/components/CommentInput";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";

interface MediaItem {
  type: "image" | "video";
  url: string;
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
  comments: initialComments,
  shares,
  media,
  autoExpandComments = false,
  targetCommentId,
}: PostProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [commentsCount, setCommentsCount] = useState(initialComments);
  const [showComments, setShowComments] = useState(autoExpandComments);
  const [replyTo, setReplyTo] = useState<{ commentId: string; username: string } | null>(null);

  useEffect(() => {
    if (!user || !postId) return;

    // Check if user already liked this post
    const checkLiked = async () => {
      const { data } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      setLiked(!!data);
    };

    checkLiked();
  }, [user, postId]);

  const handleLike = async () => {
    if (!user || !postId) {
      toast.error("Vui lòng đăng nhập để thích bài viết");
      return;
    }

    if (liked) {
      // Unlike
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (!error) {
        setLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      }
    } else {
      // Like
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: user.id });

      if (!error) {
        setLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Đã sao chép liên kết bài viết");
    } catch {
      toast.error("Không thể sao chép liên kết");
    }
  };

  const handleDelete = async () => {
    if (!user || !postId || user.id !== userId) return;

    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      toast.error("Không thể xóa bài viết");
    } else {
      toast.success("Đã xóa bài viết");
    }
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyTo({ commentId, username });
    setShowComments(true);
  };

  const handleCommentAdded = () => {
    setCommentsCount((prev) => prev + 1);
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <Link to={`/profile/${userId}`} className="flex items-center gap-3 hover:opacity-80">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatar} />
            <AvatarFallback>{author.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{author}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(timestamp, { addSuffix: true, locale: vi })}
            </p>
          </div>
        </Link>

        {user?.id === userId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa bài viết
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      {content && (
        <div className="px-4 pb-3">
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
      )}

      {/* Media */}
      {media && media.length > 0 && (
        <div className={cn(
          "grid gap-1",
          media.length === 1 && "grid-cols-1",
          media.length === 2 && "grid-cols-2",
          media.length >= 3 && "grid-cols-2"
        )}>
          {media.slice(0, 4).map((item, index) => (
            <div
              key={index}
              className={cn(
                "relative overflow-hidden bg-muted",
                media.length === 1 && "aspect-video",
                media.length === 2 && "aspect-square",
                media.length >= 3 && index === 0 && media.length === 3 && "row-span-2 aspect-[3/4]",
                media.length >= 3 && index !== 0 && "aspect-square"
              )}
            >
              {item.type === "image" ? (
                <img
                  src={item.url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <VideoPlayer
                  src={item.url}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="p-4 flex items-center gap-1 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={cn("gap-2", liked && "text-red-500")}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          <span>{likesCount > 0 ? likesCount : ""}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{commentsCount > 0 ? commentsCount : ""}</span>
        </Button>

        <Button variant="ghost" size="sm" onClick={handleShare} className="gap-2">
          <Share2 className="h-4 w-4" />
          <span>{shares > 0 ? shares : ""}</span>
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && postId && (
        <div className="border-t px-4 py-3 space-y-3">
          <CommentList
            postId={postId}
            onReply={handleReply}
            targetCommentId={targetCommentId}
          />
          <CommentInput
            postId={postId}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onCommentAdded={handleCommentAdded}
          />
        </div>
      )}
    </div>
  );
}
