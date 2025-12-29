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

      // Step 1: Get presigned URL from edge function
      const { data, error: fnError } = await supabase.functions.invoke('get-upload-url', {
        body: {
          filename: file.name,
          mediaType,
          contentType: file.type,
          fileSize: file.size
        }
      });

      if (fnError) {
        console.error('[useDirectUpload] Edge function error:', fnError);
        throw new Error(fnError.message || 'Không thể lấy URL upload');
      }

      if (!data?.success || !data?.uploadUrl) {
        console.error('[useDirectUpload] Invalid response:', data);
        throw new Error(data?.error || 'Không thể lấy URL upload');
      }

      const { uploadUrl, cdnUrl, objectKey, filename } = data;
      console.log('[useDirectUpload] Got presigned URL, starting direct upload to R2');

      // Step 2: Upload directly to R2 using XMLHttpRequest
      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progressData: UploadProgress = {
              loaded: e.loaded,
              total: e.total,
              percentage: Math.round((e.loaded / e.total) * 100)
            };
            setProgress(progressData);
          }
        });

        xhr.addEventListener('load', () => {
          xhrRef.current = null;
          if (xhr.status === 200) {
            console.log('[useDirectUpload] Upload completed successfully');
            resolve({
              success: true,
              cdnUrl,
              objectKey,
              filename
            });
          } else {
            console.error('[useDirectUpload] Upload failed:', xhr.status, xhr.responseText);
            reject(new Error(`Upload thất bại với status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          xhrRef.current = null;
          console.error('[useDirectUpload] Network error');
          reject(new Error('Lỗi mạng khi upload'));
        });

        xhr.addEventListener('abort', () => {
          xhrRef.current = null;
          reject(new Error('Upload đã bị hủy'));
        });

        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      setUploading(false);
      return result;

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
