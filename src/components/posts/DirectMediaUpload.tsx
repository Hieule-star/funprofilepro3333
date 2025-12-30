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

export function DirectMediaUpload(props: DirectMediaUploadProps) {
  return (
    <div className="border border-dashed rounded-lg p-4">
      {/* TODO: Implement media upload */}
      <p className="text-muted-foreground text-center">Upload media - Đang xây dựng...</p>
    </div>
  );
}
