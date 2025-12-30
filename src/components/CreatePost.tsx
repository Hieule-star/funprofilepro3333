import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DirectMediaUpload, UploadedMedia } from "@/components/posts/DirectMediaUpload";
import { Image, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface CreatePostProps {
  onPostCreated?: () => void;
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [posting, setPosting] = useState(false);

  const handleMediaUploaded = (media: UploadedMedia) => {
    setUploadedMedia((prev) => [...prev, media]);
  };

  const handleMediaRemoved = (objectKey: string) => {
    setUploadedMedia((prev) => prev.filter((m) => m.objectKey !== objectKey));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để đăng bài");
      return;
    }

    if (!content.trim() && uploadedMedia.length === 0) {
      toast.error("Vui lòng nhập nội dung hoặc thêm media");
      return;
    }

    setPosting(true);

    try {
      const mediaData = uploadedMedia.length > 0
        ? uploadedMedia.map((m) => ({
            type: m.type,
            url: m.cdnUrl,
            thumbnail: m.thumbnailUrl, // Include thumbnail URL for videos
          }))
        : null;

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim() || null,
        media: mediaData,
      });

      if (error) throw error;

      setContent("");
      setUploadedMedia([]);
      setShowUpload(false);
      toast.success("Đăng bài thành công!");
      onPostCreated?.();
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast.error("Không thể đăng bài. Vui lòng thử lại.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback>
            {profile?.username?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          <Textarea
            placeholder="Bạn đang nghĩ gì?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] resize-none border-0 bg-muted/50 focus-visible:ring-1"
          />

          {showUpload && (
            <DirectMediaUpload
              onMediaUploaded={handleMediaUploaded}
              onMediaRemoved={handleMediaRemoved}
              uploadedMedia={uploadedMedia}
              maxFiles={4}
            />
          )}

          <div className="flex items-center justify-between border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
              className="text-muted-foreground hover:text-primary"
            >
              <Image className="h-5 w-5 mr-2" />
              Ảnh/Video
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={posting || (!content.trim() && uploadedMedia.length === 0)}
              size="sm"
            >
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Đăng bài
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
