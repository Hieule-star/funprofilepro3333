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

export default function CommentItem(props: CommentItemProps) {
  return (
    <div className="p-2">
      {/* TODO: Implement comment item */}
      <p className="text-muted-foreground text-sm">Comment item - Đang xây dựng...</p>
    </div>
  );
}
