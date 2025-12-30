import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, Reply, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface CommentItemProps {
  comment: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    parent_id: string | null;
    profiles: {
      username: string | null;
      avatar_url: string | null;
    } | null;
  };
  currentUserId: string | null;
  onDelete: (commentId: string) => void;
  onReply: (commentId: string, username: string) => void;
  isNested?: boolean;
  isHighlighted?: boolean;
}

export default function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onReply,
  isNested = false,
  isHighlighted = false,
}: CommentItemProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchLikes = async () => {
      // Get likes count
      const { count } = await supabase
        .from("comment_likes")
        .select("*", { count: "exact", head: true })
        .eq("comment_id", comment.id);

      setLikesCount(count || 0);

      // Check if current user liked
      const { data } = await supabase
        .from("comment_likes")
        .select("id")
        .eq("comment_id", comment.id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      setLiked(!!data);
    };

    fetchLikes();
  }, [comment.id, currentUserId]);

  const handleLike = async () => {
    if (!currentUserId) {
      toast.error("Vui lòng đăng nhập");
      return;
    }

    if (liked) {
      const { error } = await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", comment.id)
        .eq("user_id", currentUserId);

      if (!error) {
        setLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      }
    } else {
      const { error } = await supabase
        .from("comment_likes")
        .insert({ comment_id: comment.id, user_id: currentUserId });

      if (!error) {
        setLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    }
  };

  const handleDelete = async () => {
    if (currentUserId !== comment.user_id) return;

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", comment.id);

    if (error) {
      toast.error("Không thể xóa bình luận");
    } else {
      onDelete(comment.id);
    }
  };

  const username = comment.profiles?.username || "Người dùng";
  const avatarUrl = comment.profiles?.avatar_url || "";

  return (
    <div
      className={cn(
        "flex gap-2",
        isNested && "ml-10",
        isHighlighted && "bg-primary/10 -mx-2 px-2 py-1 rounded"
      )}
    >
      <Link to={`/profile/${comment.user_id}`}>
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 space-y-1">
        <div className="bg-muted/50 rounded-lg px-3 py-2">
          <Link
            to={`/profile/${comment.user_id}`}
            className="font-semibold text-sm hover:underline"
          >
            {username}
          </Link>
          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(comment.created_at), {
              addSuffix: true,
              locale: vi,
            })}
          </span>

          <button
            onClick={handleLike}
            className={cn(
              "hover:text-foreground transition-colors flex items-center gap-1",
              liked && "text-red-500"
            )}
          >
            <Heart className={cn("h-3 w-3", liked && "fill-current")} />
            {likesCount > 0 && <span>{likesCount}</span>}
          </button>

          <button
            onClick={() => onReply(comment.id, username)}
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Reply className="h-3 w-3" />
            Trả lời
          </button>

          {currentUserId === comment.user_id && (
            <button
              onClick={handleDelete}
              className="hover:text-destructive transition-colors flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Xóa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
