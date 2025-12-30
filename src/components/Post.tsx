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

export default function Post(props: PostProps) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      {/* TODO: Implement post display */}
      <p className="text-muted-foreground">Post - Đang xây dựng...</p>
    </div>
  );
}
