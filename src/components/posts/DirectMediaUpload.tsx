import { useRef } from "react";
import { useDirectUpload } from "@/hooks/useDirectUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Upload, Image, Film, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface UploadedMedia {
  cdnUrl: string;
  objectKey: string;
  filename: string;
  type: "image" | "video";
  file: File;
  thumbnailUrl?: string; // New: thumbnail URL for videos
}

interface DirectMediaUploadProps {
  onMediaUploaded: (media: UploadedMedia) => void;
  onMediaRemoved: (objectKey: string) => void;
  maxFiles?: number;
  uploadedMedia: UploadedMedia[];
  className?: string;
}

export function DirectMediaUpload({
  onMediaUploaded,
  onMediaRemoved,
  maxFiles = 4,
  uploadedMedia,
  className,
}: DirectMediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, progress } = useDirectUpload();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxFiles - uploadedMedia.length;
    if (files.length > remainingSlots) {
      toast.error(`Chỉ có thể upload thêm ${remainingSlots} file`);
      return;
    }

    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        toast.error(`${file.name} không phải là ảnh hoặc video`);
        continue;
      }

      try {
        const result = await upload(file);
        if (result.success && result.cdnUrl && result.objectKey) {
          onMediaUploaded({
            cdnUrl: result.cdnUrl,
            objectKey: result.objectKey,
            filename: file.name,
            type: isImage ? "image" : "video",
            file,
            thumbnailUrl: result.thumbnailUrl,
          });
        }
      } catch (error: any) {
        toast.error(`Lỗi upload ${file.name}: ${error.message}`);
      }
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleRemove = (objectKey: string) => {
    onMediaRemoved(objectKey);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Upload Button */}
      {uploadedMedia.length < maxFiles && (
        <div
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            "hover:border-primary hover:bg-primary/5",
            uploading && "pointer-events-none opacity-50"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Đang upload...</p>
              <Progress value={progress?.percentage || 0} className="w-full max-w-xs mx-auto" />
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Kéo thả hoặc click để chọn ảnh/video
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tối đa {maxFiles} file, mỗi file tối đa 100MB
              </p>
            </>
          )}
        </div>
      )}

      {/* Preview */}
      {uploadedMedia.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {uploadedMedia.map((media) => (
            <div
              key={media.objectKey}
              className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
            >
              {media.type === "image" ? (
                <img
                  src={media.cdnUrl}
                  alt={media.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="relative w-full h-full">
                  <video
                    src={media.cdnUrl}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Film className="h-8 w-8 text-white" />
                  </div>
                </div>
              )}

              {/* Type indicator */}
              <div className="absolute top-2 left-2 bg-black/60 rounded px-2 py-0.5">
                {media.type === "image" ? (
                  <Image className="h-3 w-3 text-white" />
                ) : (
                  <Film className="h-3 w-3 text-white" />
                )}
              </div>

              {/* Remove button */}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(media.objectKey)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
