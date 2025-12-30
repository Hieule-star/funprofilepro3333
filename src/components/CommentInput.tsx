interface CommentInputProps {
  postId: string;
  replyTo?: {
    commentId: string;
    username: string;
  } | null;
  onCancelReply?: () => void;
}

export default function CommentInput({ postId }: CommentInputProps) {
  return (
    <div className="border rounded-lg p-2">
      {/* TODO: Implement comment input */}
      <p className="text-muted-foreground text-sm">Comment input - Đang xây dựng...</p>
    </div>
  );
}
