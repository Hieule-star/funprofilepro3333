import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PinStatus = 'pending' | 'pinning' | 'pinned' | 'failed' | 'unpinned';

export interface MediaAsset {
  id: string;
  type: 'image' | 'video';
  mime: string;
  size: number;
  r2_url: string | null;
  ipfs_cid: string | null;
  ipfs_gateway_url: string | null;
  pin_status: PinStatus;
  pin_attempts: number;
  last_pin_error: string | null;
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
   * Upload a file using Hybrid Storage (R2 + IPFS)
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

      // Determine media type
      const isVideo = file.type.startsWith('video/');
      const mediaType = isVideo ? 'video' : 'image';

      // Step 1: Get presigned URL from media-create-upload-url Edge Function
      const { data: createData, error: createError } = await supabase.functions.invoke(
        'media-create-upload-url',
        {
          body: {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            folder: folder,
            mediaType: mediaType,
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

      // Step 3: Update media_assets with R2 URL and trigger IPFS pin
      const { error: updateError } = await supabase
        .from('media_assets')
        .update({ r2_url: publicUrl })
        .eq('id', mediaAssetId);

      if (updateError) {
        console.error('Failed to update R2 URL:', updateError);
      }

      // Step 4: Trigger IPFS pinning in background (fire-and-forget)
      supabase.functions.invoke('media-pin-to-ipfs', {
        body: { mediaAssetId },
      }).catch((err) => {
        console.warn('IPFS pinning will be retried by scheduler:', err);
      });

      // Fetch the created media asset
      const { data: mediaAsset } = await supabase
        .from('media_assets')
        .select('*')
        .eq('id', mediaAssetId)
        .single();

      setUploading(false);
      setProgress(null);

      return {
        success: true,
        mediaAsset: mediaAsset as MediaAsset,
        publicUrl,
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
   * Retry IPFS pinning for a specific media asset
   */
  const retryPin = useCallback(async (mediaAssetId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('media-pin-to-ipfs', {
        body: { mediaAssetId },
      });

      if (error) {
        console.error('Retry pin failed:', error);
        return false;
      }

      return data?.success || false;
    } catch (err) {
      console.error('Retry pin error:', err);
      return false;
    }
  }, []);

  /**
   * Get media asset by ID
   */
  const getMediaAsset = useCallback(async (mediaAssetId: string): Promise<MediaAsset | null> => {
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
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
      .select('*')
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
    retryPin,
    getMediaAsset,
    getMediaByPostId,
    uploading,
    progress,
    error,
  };
}
