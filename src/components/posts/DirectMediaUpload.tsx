import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image, Video, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useDirectUpload, formatFileSize } from '@/hooks/useDirectUpload';

export interface UploadedMedia {
  cdnUrl: string;
  objectKey: string;
  filename: string;
  type: 'image' | 'video';
  file: File;
}

interface DirectMediaUploadProps {
  onMediaUploaded: (media: UploadedMedia) => void;
  onMediaRemoved: (objectKey: string) => void;
  maxFiles?: number;
  uploadedMedia: UploadedMedia[];
  className?: string;
}

const ACCEPTED_TYPES = {
  image: '.jpg,.jpeg,.png,.gif,.webp,.svg',
  video: '.mp4,.webm,.mov,.avi,.mkv'
};

export function DirectMediaUpload({
  onMediaUploaded,
  onMediaRemoved,
  maxFiles = 10,
  uploadedMedia,
  className
}: DirectMediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { upload, cancel, progress, uploading, error } = useDirectUpload();

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    if (uploadedMedia.length >= maxFiles) return;

    const file = files[0];
    setCurrentFile(file);

    const result = await upload(file);
    
    if (result.success && result.cdnUrl && result.objectKey && result.filename) {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      onMediaUploaded({
        cdnUrl: result.cdnUrl,
        objectKey: result.objectKey,
        filename: result.filename,
        type: mediaType,
        file
      });
    }
    
    setCurrentFile(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [upload, onMediaUploaded, uploadedMedia.length, maxFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCancel = useCallback(() => {
    cancel();
    setCurrentFile(null);
  }, [cancel]);

  const canAddMore = uploadedMedia.length < maxFiles && !uploading;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      {canAddMore && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFilePicker}
          className={cn(
            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
            isDragging 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={`${ACCEPTED_TYPES.image},${ACCEPTED_TYPES.video}`}
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Image className="h-5 w-5" />
              <Video className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">
              {isDragging ? 'Thả file vào đây' : 'Kéo thả hoặc click để chọn file'}
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, GIF, MP4, WebM, MOV (tối đa 4GB)
            </p>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploading && currentFile && progress && (
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Upload className="h-4 w-4 text-primary animate-pulse flex-shrink-0" />
              <span className="text-sm font-medium truncate">{currentFile.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
            >
              <X className="h-4 w-4 mr-1" />
              Hủy
            </Button>
          </div>
          
          <Progress value={progress.percentage} className="h-2" />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}</span>
            <span className="font-medium text-primary">{progress.percentage}%</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && !uploading && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Uploaded media preview */}
      {uploadedMedia.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {uploadedMedia.map((media) => (
            <div key={media.objectKey} className="relative group rounded-lg overflow-hidden bg-muted aspect-video">
              {media.type === 'image' ? (
                <img
                  src={media.cdnUrl}
                  alt={media.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={media.cdnUrl}
                  className="w-full h-full object-cover"
                  muted
                />
              )}
              
              {/* Overlay with remove button */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onMediaRemoved(media.objectKey)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Media type badge */}
              <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                {media.type === 'image' ? (
                  <Image className="h-3 w-3" />
                ) : (
                  <Video className="h-3 w-3" />
                )}
              </div>
              
              {/* Success indicator */}
              <div className="absolute top-1 right-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File count indicator */}
      {uploadedMedia.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {uploadedMedia.length} / {maxFiles} file đã upload
        </p>
      )}
    </div>
  );
}
