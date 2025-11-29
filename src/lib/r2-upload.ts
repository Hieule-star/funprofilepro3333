import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Note: These environment variables should be set in .env.local
// See CLOUDFLARE_SETUP.md for detailed instructions

const r2Client = new S3Client({
  region: "auto",
  endpoint: import.meta.env.VITE_R2_ENDPOINT || "https://example.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || "demo-key",
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || "demo-secret",
  },
});

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
 * Upload a file to Cloudflare R2
 * @param file - The file to upload
 * @param folder - The folder path in the bucket (default: "uploads")
 * @param onProgress - Callback for upload progress
 */
export async function uploadToR2(
  file: File,
  folder: string = "uploads",
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    
    // For demo purposes, if R2 is not configured, return a mock URL
    if (!import.meta.env.VITE_R2_ENDPOINT || import.meta.env.VITE_R2_ENDPOINT === "https://example.r2.cloudflarestorage.com") {
      // Simulate upload progress
      return new Promise((resolve) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          if (onProgress) {
            onProgress({
              loaded: (file.size * progress) / 100,
              total: file.size,
              percentage: progress,
            });
          }
          
          if (progress >= 100) {
            clearInterval(interval);
            // Return a demo URL using the file as blob URL
            const blobUrl = URL.createObjectURL(file);
            resolve({
              success: true,
              url: blobUrl,
            });
          }
        }, 200);
      });
    }

    const command = new PutObjectCommand({
      Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
      Key: fileName,
      Body: file,
      ContentType: file.type,
    });

    // Track upload progress (simplified - actual implementation would use multipart upload)
    if (onProgress) {
      onProgress({
        loaded: 0,
        total: file.size,
        percentage: 0,
      });
    }

    await r2Client.send(command);

    if (onProgress) {
      onProgress({
        loaded: file.size,
        total: file.size,
        percentage: 100,
      });
    }

    const publicUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${fileName}`;
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("Upload failed:", error);
    return { success: false, error };
  }
}

/**
 * Create a presigned URL for direct client upload
 * @param fileName - The destination file name
 * @param expiresIn - URL expiration time in seconds (default: 3600)
 */
export async function getPresignedUploadUrl(
  fileName: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
    Key: fileName,
  });

  const url = await getSignedUrl(r2Client, command, { expiresIn });
  return url;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
  const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

  if (file.size > MAX_SIZE) {
    return { valid: false, error: "File quá lớn. Kích thước tối đa là 100MB." };
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
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}
