interface CommentListProps {
  postId: string;
  onReply: (commentId: string, username: string) => void;
  targetCommentId?: string | null;
}

export default function CommentList({ postId }: CommentListProps) {
  return (
    <div className="space-y-2">
      {/* TODO: Implement comment list */}
      <p className="text-muted-foreground text-sm">Comments - Đang xây dựng...</p>
    </div>
  );
}
