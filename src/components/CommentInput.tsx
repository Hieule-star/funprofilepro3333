import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CommentInputProps {
  postId: string;
  replyTo?: {
    commentId: string;
    username: string;
  } | null;
  onCancelReply?: () => void;
  onCommentAdded?: () => void;
}

export default function CommentInput({
  postId,
  replyTo,
  onCancelReply,
  onCommentAdded,
}: CommentInputProps) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để bình luận");
      return;
    }

    if (!content.trim()) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        parent_id: replyTo?.commentId || null,
      });

      if (error) throw error;

      setContent("");
      onCancelReply?.();
      onCommentAdded?.();
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast.error("Không thể gửi bình luận");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-2">
      {replyTo && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded px-3 py-1.5">
          <span>Đang trả lời @{replyTo.username}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onCancelReply}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback>
            {profile?.username?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 flex gap-2">
          <Textarea
            placeholder="Viết bình luận..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="shrink-0"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
