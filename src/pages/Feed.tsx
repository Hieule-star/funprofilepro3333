import Sidebar from "@/components/Sidebar";
import HonorBoard from "@/components/HonorBoard";
import CreatePost from "@/components/CreatePost";
import Post from "@/components/Post";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { LiveSection } from "@/components/live/LiveSection";
import { LiveProvider } from "@/contexts/LiveContext";
interface MediaItem {
  type: "image" | "video";
  url: string;
  mimeType?: string;
}

interface PostWithProfile {
  id: string;
  content: string | null;
  media: MediaItem[] | null;
  created_at: string;
  user_id: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export default function Feed() {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const targetPostId = searchParams.get('postId');
  const targetCommentId = searchParams.get('commentId');

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts((data as unknown as PostWithProfile[]) || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Scroll to target post when loaded
  useEffect(() => {
    if (!loading && targetPostId) {
      setTimeout(() => {
        const postElement = document.getElementById(`post-${targetPostId}`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [loading, targetPostId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Sidebar */}
          <aside className="hidden lg:col-span-3 lg:block">
            <Sidebar />
          </aside>

          {/* Main Feed */}
          <main className="lg:col-span-6">
            <div className="space-y-6">
              <LiveProvider>
                <LiveSection />
              </LiveProvider>
              <CreatePost />

              {loading ? (
                <Card>
                  <CardContent className="flex min-h-[300px] items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </CardContent>
                </Card>
              ) : posts.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex min-h-[300px] flex-col items-center justify-center py-12 text-center">
                    <p className="mb-4 text-lg font-medium text-muted-foreground">
                      Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                posts.map((post) => {
                  const username = post.profiles?.username || 'User';
                  
                  return (
                    <Post
                      key={post.id}
                      postId={post.id}
                      userId={post.user_id}
                      author={username}
                      avatarUrl={post.profiles?.avatar_url}
                      content={post.content || ''}
                      timestamp={new Date(post.created_at)}
                      likes={0}
                      comments={0}
                      shares={0}
                      media={post.media || undefined}
                      autoExpandComments={post.id === targetPostId}
                      targetCommentId={post.id === targetPostId ? targetCommentId : null}
                    />
                  );
                })
              )}
            </div>
          </main>

          {/* Right Sidebar */}
          <aside className="hidden lg:col-span-3 lg:block">
            <HonorBoard />
          </aside>
        </div>
      </div>
    </div>
  );
}
