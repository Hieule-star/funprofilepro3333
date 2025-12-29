import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, X, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { DirectMediaUpload, UploadedMedia } from "./posts/DirectMediaUpload";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDraftPost, DraftMedia } from "@/hooks/useDraftPost";

export default function CreatePost() {
  const [content, setContent] = useState("");
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const { toast } = useToast();
  const { draft, hasDraft, saveDraft, clearDraft } = useDraftPost();

  // Restore draft on mount
  useEffect(() => {
    if (hasDraft && draft && !draftRestored) {
      setContent(draft.content);
      
      // Convert draft media to UploadedMedia format
      const restoredMedia: UploadedMedia[] = draft.media.map(m => ({
        cdnUrl: m.url,
        objectKey: m.url, // Use URL as key for restored drafts
        filename: m.name,
        type: m.type,
        file: new File([], m.name, { type: m.type === 'image' ? 'image/*' : 'video/*' }),
      }));
      
      setUploadedMedia(restoredMedia);
      
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

  const handleMediaUploaded = (media: UploadedMedia) => {
    const newMedia = [...uploadedMedia, media];
    setUploadedMedia(newMedia);

    // Auto-save draft
    const draftMedia: DraftMedia[] = newMedia.map(m => ({
      url: m.cdnUrl,
      type: m.type,
      name: m.filename,
      size: m.file.size,
    }));
    saveDraft(content, draftMedia);
  };

  const handleMediaRemoved = (objectKey: string) => {
    const newMedia = uploadedMedia.filter(m => m.objectKey !== objectKey);
    setUploadedMedia(newMedia);

    if (newMedia.length === 0) {
      setShowMediaUpload(false);
    }

    // Auto-save draft
    const draftMedia: DraftMedia[] = newMedia.map(m => ({
      url: m.cdnUrl,
      type: m.type,
      name: m.filename,
      size: m.file.size,
    }));
    saveDraft(content, draftMedia);
  };

  const toggleMediaUpload = () => {
    setShowMediaUpload(!showMediaUpload);
  };

  const handlePost = async () => {
    if (!content.trim() && uploadedMedia.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập nội dung hoặc thêm ảnh/video",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Bạn cần đăng nhập để đăng bài");
      }

      // Format media data for new upload system
      const mediaData = uploadedMedia.map(m => ({
        url: m.cdnUrl,
        type: m.type,
        objectKey: m.objectKey,
        filename: m.filename
      }));

      // Insert post into database
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim() || null,
          media: mediaData.map(m => ({ url: m.url, type: m.type })),
        })
        .select('id')
        .single();

      if (error) throw error;

      setIsPosting(false);
      setContent("");
      setUploadedMedia([]);
      setShowMediaUpload(false);
      clearDraft();
      
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
    
    // Auto-save draft
    const draftMedia: DraftMedia[] = uploadedMedia.map(m => ({
      url: m.cdnUrl,
      type: m.type,
      name: m.filename,
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
                  clearDraft();
                  setContent("");
                  setUploadedMedia([]);
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

        {/* Media Upload Section - New Direct Upload */}
        {showMediaUpload && (
          <DirectMediaUpload
            onMediaUploaded={handleMediaUploaded}
            onMediaRemoved={handleMediaRemoved}
            uploadedMedia={uploadedMedia}
            maxFiles={4}
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
            disabled={isPosting || (!content.trim() && uploadedMedia.length === 0)}
            className="gap-2"
          >
            {isPosting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                <span>Đang đăng...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Đăng bài</span>
              </>
            )}
          </Button>
        </div>

        {/* Media Count Badge */}
        {uploadedMedia.length > 0 && !showMediaUpload && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImagePlus className="h-4 w-4" />
            <span>{uploadedMedia.length} file đã upload</span>
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
