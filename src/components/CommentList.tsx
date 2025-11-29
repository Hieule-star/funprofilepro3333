import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CommentItem from "./CommentItem";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface CommentListProps {
  postId: string;
  onReply: (commentId: string, username: string) => void;
}

export default function CommentList({ postId, onReply }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (
          username,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    setComments(data || []);
  };

  useEffect(() => {
    fetchComments();

    // Real-time subscription
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa bình luận",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Thành công",
      description: "Đã xóa bình luận",
    });
  };

  if (comments.length === 0) {
    return null;
  }

  // Separate top-level comments and replies
  const topLevelComments = comments.filter(c => !c.parent_comment_id);
  const repliesMap = comments.reduce((acc, comment) => {
    if (comment.parent_comment_id) {
      if (!acc[comment.parent_comment_id]) {
        acc[comment.parent_comment_id] = [];
      }
      acc[comment.parent_comment_id].push(comment);
    }
    return acc;
  }, {} as Record<string, Comment[]>);

  return (
    <div className="space-y-3">
      {topLevelComments.map((comment) => (
        <div key={comment.id} className="space-y-2">
          <CommentItem
            comment={comment}
            currentUserId={currentUserId}
            onDelete={handleDelete}
            onReply={onReply}
          />
          {repliesMap[comment.id] && (
            <div className="space-y-2">
              {repliesMap[comment.id].map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  onDelete={handleDelete}
                  onReply={onReply}
                  isNested
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
