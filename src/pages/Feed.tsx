import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import HonorBoard from "@/components/HonorBoard";
import CreatePost from "@/components/CreatePost";
import Post from "@/components/Post";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

interface PostData {
  id: string;
  user_id: string;
  content: string | null;
  media: { type: "image" | "video"; url: string }[] | null;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  likes_count: number;
  comments_count: number;
}

const POSTS_PER_PAGE = 10;

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchPosts = async (offset = 0, append = false) => {
    if (offset > 0) setLoadingMore(true);
    
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        user_id,
        content,
        media,
        created_at,
        profiles!user_id (id, username, avatar_url),
        post_likes (count),
        comments (count)
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + POSTS_PER_PAGE - 1);

    if (error) {
      console.error("Error fetching posts:", error);
      setLoadingMore(false);
      return;
    }

    const formattedPosts: PostData[] = (data || []).map((post: any) => ({
      id: post.id,
      user_id: post.user_id,
      content: post.content,
      media: post.media as { type: "image" | "video"; url: string }[] | null,
      created_at: post.created_at,
      profiles: post.profiles,
      likes_count: post.post_likes?.[0]?.count || 0,
      comments_count: post.comments?.[0]?.count || 0,
    }));

    if (append) {
      setPosts((prev) => [...prev, ...formattedPosts]);
    } else {
      setPosts(formattedPosts);
    }
    
    setHasMore(formattedPosts.length === POSTS_PER_PAGE);
    setLoading(false);
    setLoadingMore(false);
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchPosts(posts.length, true);
  }, [loadingMore, hasMore, posts.length]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "500px" }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    fetchPosts();

    // Realtime subscription for new posts
    const channel = supabase
      .channel("posts-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          // Fetch the new post with profile data
          const { data } = await supabase
            .from("posts")
            .select(`
              id,
              user_id,
              content,
              media,
              created_at,
              profiles!user_id (id, username, avatar_url)
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            const newPost: PostData = {
              id: data.id,
              user_id: data.user_id,
              content: data.content,
              media: data.media as { type: "image" | "video"; url: string }[] | null,
              created_at: data.created_at,
              profiles: data.profiles as any,
              likes_count: 0,
              comments_count: 0,
            };
            setPosts((prev) => [newPost, ...prev]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        (payload) => {
          setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handlePostCreated = () => {
    // Realtime will handle the update
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-20">
              <Sidebar />
            </div>
          </aside>

          <main className="lg:col-span-6 space-y-4">
            {user && <CreatePost onPostCreated={handlePostCreated} />}

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                    <div className="flex gap-4">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-xl border bg-card p-12 text-center">
                <p className="text-muted-foreground">
                  Chưa có bài viết nào. Hãy là người đầu tiên đăng bài!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Post
                    key={post.id}
                    postId={post.id}
                    userId={post.user_id}
                    author={post.profiles?.username || "Người dùng"}
                    avatar={post.profiles?.avatar_url || ""}
                    content={post.content || ""}
                    timestamp={new Date(post.created_at)}
                    likes={post.likes_count}
                    comments={post.comments_count}
                    shares={0}
                    media={post.media || undefined}
                  />
                ))}
                
                {/* Load more trigger */}
                <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                  {loadingMore && (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            )}
          </main>

          <aside className="hidden lg:col-span-3 lg:block">
            <div className="sticky top-20">
              <HonorBoard />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
