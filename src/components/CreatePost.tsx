import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, X } from "lucide-react";
import { useState, useEffect } from "react";
import MediaUpload, { MediaFile } from "./MediaUpload";
import { useToast } from "@/hooks/use-toast";
import { useDraftPost, DraftMedia } from "@/hooks/useDraftPost";

export default function CreatePost() {
  const [content, setContent] = useState("");
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const { toast } = useToast();
  const { draft, hasDraft, saveDraft, clearDraft } = useDraftPost();

  // Restore draft on mount
  useEffect(() => {
    if (hasDraft && draft && !draftRestored) {
      setContent(draft.content);
      
      // Convert draft media to MediaFile format
      const restoredMedia: MediaFile[] = draft.media.map(m => ({
        file: new File([], m.name, { type: m.type === 'image' ? 'image/*' : 'video/*' }),
        preview: m.url,
        type: m.type,
        url: m.url,
      }));
      
      setMedia(restoredMedia);
      
      if (draft.media.length > 0) {
        setShowMediaUpload(true);
      }
      
      setDraftRestored(true);
      
      toast({
        title: "Đã khôi phục bản nháp",
        description: "Bài viết chưa đăng của bạn đã được khôi phục",
      });
    }
  }, [hasDraft, draft, draftRestored, toast]);

  const handleMediaChange = (newMedia: MediaFile[]) => {
    setMedia(newMedia);
    if (newMedia.length === 0) {
      setShowMediaUpload(false);
    }

    // Auto-save draft when media changes
    const draftMedia: DraftMedia[] = newMedia
      .filter(m => m.url)
      .map(m => ({
        url: m.url!,
        type: m.type,
        name: m.file.name,
        size: m.file.size,
      }));
    saveDraft(content, draftMedia);
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
      clearDraft(); // Clear draft after successful post
      
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

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Auto-save draft when content changes
    const draftMedia: DraftMedia[] = media
      .filter(m => m.url)
      .map(m => ({
        url: m.url!,
        type: m.type,
        name: m.file.name,
        size: m.file.size,
      }));
    saveDraft(newContent, draftMedia);
  };

  return (
    <Card className="border-primary/20 shadow-md">
      <CardContent className="space-y-4 pt-6">
        {/* Draft notification banner */}
        {hasDraft && draftRestored && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              📝 Bản nháp đã được khôi phục
            </span>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  // Manual restore
                  const stored = localStorage.getItem('post_draft');
                  if (stored) {
                    try {
                      const parsed = JSON.parse(stored);
                      setContent(parsed.content || "");
                      const restoredMedia = (parsed.media || []).map((m: any) => ({
                        file: new File([], m.name, { type: m.type === 'image' ? 'image/*' : 'video/*' }),
                        preview: m.url,
                        type: m.type,
                        url: m.url,
                      }));
                      setMedia(restoredMedia);
                      if (restoredMedia.length > 0) {
                        setShowMediaUpload(true);
                      }
                      toast({ title: "Đã tải lại bản nháp" });
                    } catch (error) {
                      toast({ title: "Không thể tải bản nháp", variant: "destructive" });
                    }
                  } else {
                    toast({ title: "Không có bản nháp", variant: "destructive" });
                  }
                }}
                className="h-7 gap-1"
              >
                🔄 Tải lại
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  clearDraft();
                  setContent("");
                  setMedia([]);
                  setShowMediaUpload(false);
                  setDraftRestored(false);
                }}
                className="h-7 gap-1"
              >
                <X className="h-3 w-3" />
                Xóa
              </Button>
            </div>
          </div>
        )}

        <Textarea
          placeholder="Bạn đang nghĩ gì?"
          value={content}
          onChange={handleContentChange}
          className="min-h-[100px] resize-none border-muted"
        />

        {/* Media Upload Section */}
        {showMediaUpload && (
          <MediaUpload 
            onMediaChange={handleMediaChange} 
            maxFiles={4}
            initialMedia={media}
          />
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
          </div>
          
          <Button
            onClick={handlePost}
            disabled={isPosting || (!content.trim() && media.length === 0)}
            className="gap-2"
          >
            {isPosting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                <span>Đang đăng...</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4" />
                <span>Đăng bài</span>
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
