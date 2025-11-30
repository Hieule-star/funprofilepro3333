import Sidebar from "@/components/Sidebar";
import HonorBoard from "@/components/HonorBoard";
import CreatePost from "@/components/CreatePost";
import Post from "@/components/Post";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MediaItem {
  type: "image" | "video";
  url: string;
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
      setPosts((data as any) || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    // Real-time subscription for all post changes
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'posts'
        },
        () => {
          fetchPosts(); // Refresh when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Sidebar */}
          <aside className="hidden lg:col-span-3 lg:block">
            <Sidebar />
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-6">
            <div className="space-y-6">
              {/* Create Post */}
              <CreatePost />

              {/* Loading State */}
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
                  const avatarInitials = username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  
                  return (
                    <Post
                      key={post.id}
                      postId={post.id}
                      userId={post.user_id}
                      author={username}
                      avatar={avatarInitials}
                      content={post.content || ''}
                      timestamp={new Date(post.created_at)}
                      likes={0}
                      comments={0}
                      shares={0}
                      media={post.media || undefined}
                    />
                  );
                })
              )}
            </div>
          </main>

          {/* Right Sidebar - Honor Board */}
          <aside className="hidden lg:col-span-3 lg:block">
            <HonorBoard />
          </aside>
        </div>
      </div>
    </div>
  );
}
