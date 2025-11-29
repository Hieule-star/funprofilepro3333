import { supabase } from "@/integrations/supabase/client";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: any;
}

/**
 * Upload a file to Cloudflare R2 using presigned URL (direct browser upload)
 */
export async function uploadToR2(
  file: File,
  folder: string = "uploads",
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Step 1: Get presigned URL from Edge Function
    const { data, error } = await supabase.functions.invoke('generate-presigned-url', {
      body: {
        fileName: file.name,
        fileType: file.type,
        folder: folder,
      },
    });

    if (error) {
      console.error("Error getting presigned URL:", error);
      throw error;
    }

    if (!data || !data.success) {
      throw new Error(data?.error || "Failed to get presigned URL");
    }

    const { presignedUrl, publicUrl } = data;

    // Step 2: Upload file directly to R2 using presigned URL with progress tracking
    return new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          console.log("Upload successful");
          resolve({ success: true, url: publicUrl });
        } else {
          console.error("Upload failed with status:", xhr.status);
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        console.error("Upload error");
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener('abort', () => {
        console.error("Upload aborted");
        reject(new Error("Upload aborted"));
      });

      xhr.open('PUT', presignedUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return { success: false, error };
  }
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 4000 * 1024 * 1024; // 4000MB
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
  const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

  if (file.size > MAX_SIZE) {
    return { valid: false, error: "File quá lớn. Kích thước tối đa là 4000MB." };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Định dạng file không được hỗ trợ." };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
