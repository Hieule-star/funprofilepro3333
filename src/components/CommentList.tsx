import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CommentItem from "@/components/CommentItem";
import { Skeleton } from "@/components/ui/skeleton";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface CommentListProps {
  postId: string;
  onReply: (commentId: string, username: string) => void;
  targetCommentId?: string | null;
}

export default function CommentList({
  postId,
  onReply,
  targetCommentId,
}: CommentListProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        id,
        content,
        created_at,
        user_id,
        parent_id,
        profiles!user_id (username, avatar_url)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return;
    }

    setComments(data as Comment[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();

    // Realtime subscription
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          // Fetch the new comment with profile
          const { data } = await supabase
            .from("comments")
            .select(`
              id,
              content,
              created_at,
              user_id,
              parent_id,
              profiles!user_id (username, avatar_url)
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setComments((prev) => [...prev, data as Comment]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const handleDelete = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  // Organize comments: top-level and replies
  const topLevelComments = comments.filter((c) => !c.parent_id);
  const repliesMap = comments.reduce((acc, comment) => {
    if (comment.parent_id) {
      if (!acc[comment.parent_id]) {
        acc[comment.parent_id] = [];
      }
      acc[comment.parent_id].push(comment);
    }
    return acc;
  }, {} as Record<string, Comment[]>);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Chưa có bình luận nào
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {topLevelComments.map((comment) => (
        <div key={comment.id} className="space-y-2">
          <CommentItem
            comment={comment}
            currentUserId={user?.id || null}
            onDelete={handleDelete}
            onReply={onReply}
            isHighlighted={targetCommentId === comment.id}
          />

          {/* Replies */}
          {repliesMap[comment.id]?.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={user?.id || null}
              onDelete={handleDelete}
              onReply={onReply}
              isNested
              isHighlighted={targetCommentId === reply.id}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
