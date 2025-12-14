import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Image, Video, X, Upload, AlertCircle } from "lucide-react";
import { validateFile, formatFileSize } from "@/lib/supabase-upload";
import { useToast } from "@/hooks/use-toast";
import { saveMediaToDraftDirect } from "@/hooks/useDraftPost";
import { useMediaUpload, MediaAsset, UploadProgress } from "@/hooks/useMediaUpload";
import { MediaStatusBadge, MediaStatusIndicator } from "@/components/ui/MediaStatusBadge";
import { supabase } from "@/integrations/supabase/client";

export interface MediaFile {
  file: File;
  preview: string;
  type: "image" | "video";
  url?: string;
  mediaAssetId?: string;
  pinStatus?: MediaAsset['pin_status'];
  ipfsCid?: string | null;
  ipfsGatewayUrl?: string | null;
}

interface MediaUploadProps {
  onMediaChange: (media: MediaFile[]) => void;
  maxFiles?: number;
  initialMedia?: MediaFile[];
}

export default function MediaUpload({ onMediaChange, maxFiles = 4, initialMedia = [] }: MediaUploadProps) {
  const [media, setMedia] = useState<MediaFile[]>(initialMedia);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { uploadFile, retryPin, uploading, progress } = useMediaUpload();

  // Subscribe to media_assets changes for IPFS status updates
  useEffect(() => {
    const mediaAssetIds = media.filter(m => m.mediaAssetId).map(m => m.mediaAssetId);
    if (mediaAssetIds.length === 0) return;

    const channel = supabase
      .channel('media-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media_assets',
        },
        (payload) => {
          const updated = payload.new as MediaAsset;
          setMedia(prev => prev.map(m => {
            if (m.mediaAssetId === updated.id) {
              return {
                ...m,
                pinStatus: updated.pin_status,
                ipfsCid: updated.ipfs_cid,
                ipfsGatewayUrl: updated.ipfs_gateway_url,
              };
            }
            return m;
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [media.length]);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: { file: File; preview: string; type: "image" | "video" }[] = [];

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

    // Upload files using Hybrid Storage
    const uploadedFiles: MediaFile[] = [];

    for (const validFile of validFiles) {
      const result = await uploadFile(
        validFile.file,
        validFile.type === "image" ? "images" : "videos"
      );

      if (result.success && result.publicUrl) {
        const mediaFile: MediaFile = {
          file: validFile.file,
          preview: validFile.preview,
          type: validFile.type,
          url: result.publicUrl,
          mediaAssetId: result.mediaAsset?.id,
          pinStatus: result.mediaAsset?.pin_status || 'pending',
          ipfsCid: result.mediaAsset?.ipfs_cid,
          ipfsGatewayUrl: result.mediaAsset?.ipfs_gateway_url,
        };
        uploadedFiles.push(mediaFile);

        // Save to draft immediately
        saveMediaToDraftDirect(
          result.publicUrl,
          validFile.type,
          validFile.file.name,
          validFile.file.size
        );
      } else {
        toast({
          title: "Lỗi upload",
          description: result.error || `Không thể upload ${validFile.file.name}`,
          variant: "destructive",
        });
      }
    }

    const newMedia = [...media, ...uploadedFiles];
    setMedia(newMedia);
    onMediaChange(newMedia);

    if (uploadedFiles.length > 0) {
      toast({
        title: "Upload thành công",
        description: `Đã upload ${uploadedFiles.length} file (IPFS đang xử lý)`,
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

  const handleRetryPin = async (mediaAssetId: string) => {
    const success = await retryPin(mediaAssetId);
    if (success) {
      toast({
        title: "Đang thử lại",
        description: "IPFS pinning đang được xử lý lại",
      });
    } else {
      toast({
        title: "Lỗi",
        description: "Không thể thử lại IPFS pinning",
        variant: "destructive",
      });
    }
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
            <p className="text-xs text-primary mt-1">
              🌐 Media sẽ được lưu trữ vĩnh viễn trên IPFS
            </p>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && progress && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Đang upload...</span>
              <span className="text-muted-foreground">{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
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
              
              {/* IPFS Status Indicator */}
              {item.pinStatus && (
                <div className="absolute left-2 top-2">
                  <MediaStatusIndicator pinStatus={item.pinStatus} />
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

              {/* File info overlay with IPFS status */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-xs text-white truncate">
                  {item.file.name}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-white/70">
                    {formatFileSize(item.file.size)}
                  </p>
                  {item.pinStatus && item.mediaAssetId && (
                    <MediaStatusBadge
                      pinStatus={item.pinStatus}
                      ipfsCid={item.ipfsCid}
                      ipfsGatewayUrl={item.ipfsGatewayUrl}
                      onRetry={item.pinStatus === 'failed' 
                        ? () => handleRetryPin(item.mediaAssetId!)
                        : undefined
                      }
                      showLabel={false}
                      size="sm"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
