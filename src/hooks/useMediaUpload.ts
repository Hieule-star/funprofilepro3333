import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { transformToMediaCdn } from '@/lib/media-url';

export interface MediaAsset {
  id: string;
  type: 'image' | 'video';
  mime: string;
  size: number;
  r2_url: string | null;
  original_filename: string | null;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  mediaAsset?: MediaAsset;
  publicUrl?: string;
  error?: string;
}

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload a file to R2 storage via CDN
   */
  const uploadFile = useCallback(async (
    file: File,
    folder: string = 'posts',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> => {
    setUploading(true);
    setProgress(null);
    setError(null);

    try {
      // Validate file
      const MAX_SIZE = 4000 * 1024 * 1024; // 4GB
      if (file.size > MAX_SIZE) {
        throw new Error('File quá lớn. Kích thước tối đa là 4GB.');
      }

      // Step 1: Get presigned URL from Edge Function
      const { data: createData, error: createError } = await supabase.functions.invoke(
        'media-create-upload-url',
        {
          body: {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            folder: folder,
          },
        }
      );

      if (createError) {
        throw new Error(createError.message || 'Không thể tạo URL upload');
      }

      if (!createData?.success) {
        throw new Error(createData?.error || 'Không thể tạo URL upload');
      }

      const { uploadUrl, publicUrl, mediaAssetId } = createData;

      // Step 2: Upload file directly to R2 using presigned URL
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progressData: UploadProgress = {
              loaded: e.loaded,
              total: e.total,
              percentage: Math.round((e.loaded / e.total) * 100),
            };
            setProgress(progressData);
            onProgress?.(progressData);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Step 3: Confirm upload
      console.log('[MediaUpload] Confirming upload:', mediaAssetId);
      const { data: confirmData, error: confirmError } = await supabase.functions.invoke(
        'media-confirm-upload',
        {
          body: { mediaAssetId },
        }
      );

      if (confirmError) {
        console.error('[MediaUpload] Failed to confirm:', confirmError);
        throw new Error(confirmError.message || 'Failed to confirm upload');
      }

      if (!confirmData?.success) {
        console.error('[MediaUpload] Confirmation failed:', confirmData?.error);
        throw new Error(confirmData?.error || 'Upload confirmation failed');
      }

      console.log('[MediaUpload] Upload confirmed successfully');

      // Fetch the created media asset
      const { data: mediaAsset } = await supabase
        .from('media_assets')
        .select('id, type, mime, size, r2_url, original_filename')
        .eq('id', mediaAssetId)
        .single();

      setUploading(false);
      setProgress(null);

      return {
        success: true,
        mediaAsset: mediaAsset as MediaAsset,
        publicUrl: transformToMediaCdn(publicUrl),
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      setUploading(false);
      setProgress(null);
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Get media asset by ID
   */
  const getMediaAsset = useCallback(async (mediaAssetId: string): Promise<MediaAsset | null> => {
    const { data, error } = await supabase
      .from('media_assets')
      .select('id, type, mime, size, r2_url, original_filename')
      .eq('id', mediaAssetId)
      .single();

    if (error) {
      console.error('Failed to get media asset:', error);
      return null;
    }

    return data as MediaAsset;
  }, []);

  /**
   * Get all media assets for a post
   */
  const getMediaByPostId = useCallback(async (postId: string): Promise<MediaAsset[]> => {
    const { data, error } = await supabase
      .from('media_assets')
      .select('id, type, mime, size, r2_url, original_filename')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to get media assets:', error);
      return [];
    }

    return data as MediaAsset[];
  }, []);

  return {
    uploadFile,
    getMediaAsset,
    getMediaByPostId,
    uploading,
    progress,
    error,
  };
}
