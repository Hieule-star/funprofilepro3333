import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Trash2, Reply, Heart, Edit2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  isHighlighted = false
}: CommentItemProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const username = comment.profiles?.username || 'User';
  const avatarInitials = username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const isOwner = currentUserId === comment.user_id;

  useEffect(() => {
    if (currentUserId) {
      checkIfLiked();
    }
    fetchLikesCount();

    // Real-time subscription for likes
    const channel = supabase
      .channel(`comment-likes-${comment.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_likes',
          filter: `comment_id=eq.${comment.id}`
        },
        () => {
          fetchLikesCount();
          if (currentUserId) {
            checkIfLiked();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [comment.id, currentUserId]);

  const checkIfLiked = async () => {
    if (!currentUserId) return;

    const { data } = await supabase
      .from("comment_likes")
      .select("id")
      .eq("comment_id", comment.id)
      .eq("user_id", currentUserId)
      .maybeSingle();

    setLiked(!!data);
  };

  const fetchLikesCount = async () => {
    const { count } = await supabase
      .from("comment_likes")
      .select("*", { count: "exact", head: true })
      .eq("comment_id", comment.id);

    setLikesCount(count || 0);
  };

  const handleLike = async () => {
    if (!currentUserId) {
      toast({
        title: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập để thích bình luận",
        variant: "destructive",
      });
      return;
    }

    try {
      if (liked) {
        // Unlike
        await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", comment.id)
          .eq("user_id", currentUserId);
        
        setLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        // Like
        await supabase
          .from("comment_likes")
          .insert({
            comment_id: comment.id,
            user_id: currentUserId,
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

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      toast({
        title: "Lỗi",
        description: "Nội dung bình luận không được để trống",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("comments")
      .update({ content: editContent.trim() })
      .eq("id", comment.id);

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật bình luận",
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    toast({
      title: "Thành công",
      description: "Đã cập nhật bình luận",
    });

    setIsEditing(false);
    setIsSaving(false);
  };

  return (
    <div 
      id={`comment-${comment.id}`}
      className={`flex gap-2 ${isNested ? 'ml-10' : ''} ${
        isHighlighted ? 'animate-pulse' : ''
      }`}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-primary/10 text-xs">
          {avatarInitials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className={`bg-muted rounded-lg px-3 py-2 ${
          isHighlighted ? 'ring-2 ring-primary' : ''
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">{username}</p>
              {isHighlighted && (
                <Badge variant="default" className="h-5 text-xs animate-pulse">
                  Mới
                </Badge>
              )}
            </div>
            {isOwner && !isEditing && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleEdit}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onDelete(comment.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
                disabled={isSaving}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="h-7 px-2"
                >
                  <X className="h-3 w-3 mr-1" />
                  Hủy
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editContent.trim()}
                  className="h-7 px-2"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Lưu
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-1">{comment.content}</p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 px-3">
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { 
              addSuffix: true,
              locale: vi 
            })}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 text-xs gap-1 px-2 ${
              liked ? "text-destructive" : "text-muted-foreground hover:text-destructive"
            }`}
            onClick={handleLike}
          >
            <Heart className={`h-3 w-3 ${liked ? "fill-current" : ""}`} />
            {likesCount > 0 && <span>{likesCount}</span>}
          </Button>
          {!isNested && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => onReply(comment.id, username)}
            >
              <Reply className="h-3 w-3" />
              Trả lời
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
