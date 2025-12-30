import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  cdnUrl?: string;
  objectKey?: string;
  filename?: string;
  thumbnailUrl?: string; // New: thumbnail URL for videos
  error?: string;
}

export interface UseDirectUploadReturn {
  upload: (file: File) => Promise<UploadResult>;
  cancel: () => void;
  progress: UploadProgress | null;
  uploading: boolean;
  error: string | null;
}

const MAX_FILE_SIZE = 4000 * 1024 * 1024; // 4GB

const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
};

function getMediaType(mimeType: string): 'image' | 'video' | null {
  if (ALLOWED_TYPES.image.includes(mimeType)) return 'image';
  if (ALLOWED_TYPES.video.includes(mimeType)) return 'video';
  return null;
}

/**
 * Extract thumbnail from video file
 * Returns a Blob of the thumbnail image
 */
async function extractVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const timeout = setTimeout(() => {
      console.log('[extractVideoThumbnail] Timeout, skipping thumbnail');
      video.remove();
      URL.revokeObjectURL(video.src);
      resolve(null);
    }, 10000);

    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, video.duration / 4); // Seek to 0.5s or 1/4 of duration
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth, 640); // Max 640px width
        canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              video.remove();
              URL.revokeObjectURL(video.src);
              resolve(blob);
            },
            'image/jpeg',
            0.8
          );
        } else {
          video.remove();
          URL.revokeObjectURL(video.src);
          resolve(null);
        }
      } catch (e) {
        console.log('[extractVideoThumbnail] Error:', e);
        video.remove();
        URL.revokeObjectURL(video.src);
        resolve(null);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      console.log('[extractVideoThumbnail] Video error');
      video.remove();
      URL.revokeObjectURL(video.src);
      resolve(null);
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Upload a single file to R2 via presigned URL
 */
async function uploadFileToR2(
  file: File | Blob,
  filename: string,
  mediaType: 'image' | 'video',
  contentType: string,
  onProgress?: (progress: UploadProgress) => void,
  xhrRef?: React.MutableRefObject<XMLHttpRequest | null>
): Promise<{ cdnUrl: string; objectKey: string; filename: string } | null> {
  // Get presigned URL
  const { data, error: fnError } = await supabase.functions.invoke('get-upload-url', {
    body: {
      filename,
      mediaType,
      contentType,
      fileSize: file.size
    }
  });

  if (fnError || !data?.success || !data?.uploadUrl) {
    console.error('[uploadFileToR2] Failed to get presigned URL:', fnError || data?.error);
    return null;
  }

  const { uploadUrl, cdnUrl, objectKey, filename: returnedFilename } = data;

  // Upload to R2
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    if (xhrRef) xhrRef.current = xhr;

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100)
          });
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhrRef) xhrRef.current = null;
      if (xhr.status === 200) {
        resolve({ cdnUrl, objectKey, filename: returnedFilename });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      if (xhrRef) xhrRef.current = null;
      reject(new Error('Network error'));
    });

    xhr.addEventListener('abort', () => {
      if (xhrRef) xhrRef.current = null;
      reject(new Error('Upload cancelled'));
    });

    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
}

export function useDirectUpload(): UseDirectUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const cancel = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
      setUploading(false);
      setProgress(null);
      setError('Upload đã bị hủy');
      console.log('[useDirectUpload] Upload cancelled');
    }
  }, []);

  const upload = useCallback(async (file: File): Promise<UploadResult> => {
    setUploading(true);
    setProgress(null);
    setError(null);

    try {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        throw new Error(`File quá lớn (${sizeInMB}MB). Kích thước tối đa là 4GB.`);
      }

      // Validate file type
      const mediaType = getMediaType(file.type);
      if (!mediaType) {
        throw new Error(`Định dạng file không được hỗ trợ: ${file.type}`);
      }

      console.log('[useDirectUpload] Starting upload:', {
        name: file.name,
        type: file.type,
        size: file.size,
        mediaType
      });

      let thumbnailUrl: string | undefined;

      // For videos, extract and upload thumbnail first
      if (mediaType === 'video') {
        console.log('[useDirectUpload] Extracting video thumbnail...');
        setProgress({ loaded: 0, total: 100, percentage: 0 });
        
        const thumbnailBlob = await extractVideoThumbnail(file);
        
        if (thumbnailBlob) {
          console.log('[useDirectUpload] Uploading thumbnail...');
          const thumbnailFilename = file.name.replace(/\.[^.]+$/, '_thumb.jpg');
          
          try {
            const thumbResult = await uploadFileToR2(
              thumbnailBlob,
              thumbnailFilename,
              'image',
              'image/jpeg'
            );
            
            if (thumbResult) {
              thumbnailUrl = thumbResult.cdnUrl;
              console.log('[useDirectUpload] Thumbnail uploaded:', thumbnailUrl);
            }
          } catch (e) {
            console.log('[useDirectUpload] Thumbnail upload failed, continuing without thumbnail');
          }
        }
      }

      // Upload main file
      console.log('[useDirectUpload] Uploading main file...');
      const result = await uploadFileToR2(
        file,
        file.name,
        mediaType,
        file.type,
        setProgress,
        xhrRef
      );

      if (!result) {
        throw new Error('Upload thất bại');
      }

      console.log('[useDirectUpload] Upload completed successfully');
      setUploading(false);
      
      return {
        success: true,
        cdnUrl: result.cdnUrl,
        objectKey: result.objectKey,
        filename: result.filename,
        thumbnailUrl
      };

    } catch (err: any) {
      const errorMessage = err.message || 'Upload thất bại';
      console.error('[useDirectUpload] Error:', errorMessage);
      setError(errorMessage);
      setUploading(false);
      setProgress(null);
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    upload,
    cancel,
    progress,
    uploading,
    error
  };
}

// Utility to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
