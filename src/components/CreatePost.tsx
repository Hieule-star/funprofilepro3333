import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Video, Smile, Send } from "lucide-react";
import { useState } from "react";
import MediaUpload, { MediaFile } from "./MediaUpload";
import { useToast } from "@/hooks/use-toast";

export default function CreatePost() {
  const [content, setContent] = useState("");
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  const handleMediaChange = (newMedia: MediaFile[]) => {
    setMedia(newMedia);
    if (newMedia.length === 0) {
      setShowMediaUpload(false);
    }
  };

  const toggleMediaUpload = () => {
    setShowMediaUpload(!showMediaUpload);
  };

  const handlePost = async () => {
    if (!content.trim() && media.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập nội dung hoặc thêm ảnh/video",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Bạn cần đăng nhập để đăng bài");
      }

      // Format media data
      const mediaData = media.map(m => ({
        url: m.url,
        type: m.type
      })).filter(m => m.url);

      // Insert post into database
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim() || null,
          media: mediaData.length > 0 ? mediaData : null,
        });

      if (error) throw error;

      setIsPosting(false);
      setContent("");
      setMedia([]);
      setShowMediaUpload(false);
      
      toast({
        title: "Thành công",
        description: "Bài viết của bạn đã được đăng!",
      });
    } catch (error: any) {
      console.error("Error posting:", error);
      setIsPosting(false);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể đăng bài. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-primary/20 shadow-md">
      <CardContent className="space-y-4 pt-6">
        <Textarea
          placeholder="Bạn đang nghĩ gì?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px] resize-none border-muted"
        />

        {/* Media Upload Section */}
        {showMediaUpload && (
          <MediaUpload onMediaChange={handleMediaChange} maxFiles={4} />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={showMediaUpload ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              onClick={toggleMediaUpload}
            >
              <ImagePlus className="h-4 w-4" />
              <span className="hidden sm:inline">
                {showMediaUpload ? "Đang chọn media" : "Ảnh/Video"}
              </span>
            </Button>
            <Button 
              type="button"
              variant="ghost" 
              size="sm" 
              className="gap-2 text-warning"
            >
              <Smile className="h-4 w-4" />
              <span className="hidden sm:inline">Cảm xúc</span>
            </Button>
          </div>
          
          <Button
            onClick={handlePost}
            disabled={isPosting || (!content.trim() && media.length === 0)}
            className="gap-2 bg-primary hover:bg-primary-light"
          >
            {isPosting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                <span className="hidden sm:inline">Đang đăng...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Đăng bài</span>
              </>
            )}
          </Button>
        </div>

        {/* Media Count Badge */}
        {media.length > 0 && !showMediaUpload && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImagePlus className="h-4 w-4" />
            <span>{media.length} file đã chọn</span>
            <button
              type="button"
              onClick={toggleMediaUpload}
              className="text-primary hover:underline"
            >
              Xem
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
