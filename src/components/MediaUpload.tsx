import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Image, Video, X, Upload, AlertCircle } from "lucide-react";
import { uploadToR2, validateFile, formatFileSize, UploadProgress } from "@/lib/supabase-upload";
import { useToast } from "@/hooks/use-toast";

export interface MediaFile {
  file: File;
  preview: string;
  type: "image" | "video";
  url?: string;
}

interface MediaUploadProps {
  onMediaChange: (media: MediaFile[]) => void;
  maxFiles?: number;
}

export default function MediaUpload({ onMediaChange, maxFiles = 4 }: MediaUploadProps) {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: MediaFile[] = [];

    // Validate files
    for (const file of fileArray) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast({
          title: "Lỗi upload",
          description: validation.error,
          variant: "destructive",
        });
        continue;
      }

      const mediaType = file.type.startsWith("image/") ? "image" : "video";
      const preview = URL.createObjectURL(file);
      validFiles.push({ file, preview, type: mediaType });
    }

    if (validFiles.length === 0) return;

    // Check max files limit
    if (media.length + validFiles.length > maxFiles) {
      toast({
        title: "Giới hạn file",
        description: `Bạn chỉ có thể upload tối đa ${maxFiles} file`,
        variant: "destructive",
      });
      return;
    }

    // Upload files
    setUploading(true);
    const uploadedFiles: MediaFile[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const mediaFile = validFiles[i];
      
      try {
        const result = await uploadToR2(
          mediaFile.file,
          mediaFile.type === "image" ? "images" : "videos",
          (progress: UploadProgress) => {
            const fileProgress = ((i / validFiles.length) + (progress.percentage / 100 / validFiles.length)) * 100;
            setUploadProgress(Math.round(fileProgress));
          }
        );

        if (result.success && result.url) {
          uploadedFiles.push({ ...mediaFile, url: result.url });
        } else {
          toast({
            title: "Lỗi upload",
            description: `Không thể upload ${mediaFile.file.name}`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Lỗi upload",
          description: "Đã xảy ra lỗi khi upload file",
          variant: "destructive",
        });
      }
    }

    setUploading(false);
    setUploadProgress(0);

    const newMedia = [...media, ...uploadedFiles];
    setMedia(newMedia);
    onMediaChange(newMedia);

    if (uploadedFiles.length > 0) {
      toast({
        title: "Upload thành công",
        description: `Đã upload ${uploadedFiles.length} file`,
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removeMedia = (index: number) => {
    const newMedia = media.filter((_, i) => i !== index);
    setMedia(newMedia);
    onMediaChange(newMedia);
    
    // Revoke object URL to free memory
    URL.revokeObjectURL(media[index].preview);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {media.length < maxFiles && (
        <div
          className={`relative rounded-lg border-2 border-dashed transition-all ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">
              Kéo thả file vào đây hoặc{" "}
              <button
                type="button"
                onClick={openFilePicker}
                className="text-primary hover:underline"
              >
                chọn file
              </button>
            </p>
            <p className="text-xs text-muted-foreground">
              Hỗ trợ JPG, PNG, GIF, WebP, MP4, WebM (Tối đa 4000 MB)
            </p>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Đang upload...</span>
              <span className="text-muted-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        </Card>
      )}

      {/* Media Preview Grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {media.map((item, index) => (
            <div
              key={index}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              {item.type === "image" ? (
                <img
                  src={item.preview}
                  alt="Preview"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <Video className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeMedia(index)}
                className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>

              {/* File info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-xs text-white truncate">
                  {item.file.name}
                </p>
                <p className="text-xs text-white/70">
                  {formatFileSize(item.file.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
