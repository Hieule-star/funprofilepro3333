# Hướng dẫn tích hợp Cloudflare R2 cho lưu trữ Media

## Giới thiệu
Dự án này được thiết kế để sử dụng Cloudflare R2 cho việc lưu trữ và phân phối hình ảnh, video của người dùng.

## Cài đặt Cloudflare R2

### Bước 1: Tạo R2 Bucket
1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Chọn "R2" từ sidebar
3. Nhấn "Create bucket"
4. Đặt tên bucket (ví dụ: `camly-fun-media`)

### Bước 2: Lấy API Credentials
1. Trong R2 dashboard, chọn "Manage R2 API tokens"
2. Nhấn "Create API token"
3. Đặt tên token và chọn quyền:
   - Object Read & Write
   - Bucket Read
4. Lưu lại:
   - Access Key ID
   - Secret Access Key
   - Endpoint URL (dạng: `https://[account-id].r2.cloudflarestorage.com`)

### Bước 3: Cấu hình Public Access (Optional)
Nếu muốn cho phép truy cập public vào media:
1. Trong bucket settings, chọn "Settings"
2. Bật "Public access"
3. Hoặc connect custom domain qua Cloudflare Workers

## Tích hợp vào ứng dụng

### Cấu hình Environment Variables

Tạo file `.env.local` với nội dung:

```env
# Cloudflare R2 Configuration
VITE_R2_ACCOUNT_ID=your_account_id
VITE_R2_ACCESS_KEY_ID=your_access_key_id
VITE_R2_SECRET_ACCESS_KEY=your_secret_access_key
VITE_R2_BUCKET_NAME=camly-fun-media
VITE_R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
VITE_R2_PUBLIC_URL=https://your-public-domain.com
```

### Cài đặt AWS SDK
Cloudflare R2 tương thích với S3 API:

```bash
npm install @aws-sdk/client-s3
npm install @aws-sdk/s3-request-presigner
```

### Ví dụ Upload Service

Tạo file `src/lib/r2-upload.ts`:

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Client = new S3Client({
  region: "auto",
  endpoint: import.meta.env.VITE_R2_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(file: File, folder: string = "uploads") {
  const fileName = `${folder}/${Date.now()}-${file.name}`;
  
  const command = new PutObjectCommand({
    Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
    Key: fileName,
    Body: file,
    ContentType: file.type,
  });

  try {
    await r2Client.send(command);
    const publicUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${fileName}`;
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("Upload failed:", error);
    return { success: false, error };
  }
}

// Tạo presigned URL cho direct upload từ client
export async function getPresignedUploadUrl(fileName: string) {
  const command = new PutObjectCommand({
    Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
    Key: fileName,
  });

  const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  return url;
}
```

### Sử dụng trong Component

```typescript
import { uploadToR2 } from "@/lib/r2-upload";

const handleFileUpload = async (file: File) => {
  const result = await uploadToR2(file, "posts");
  if (result.success) {
    console.log("File uploaded:", result.url);
    // Lưu URL vào database hoặc state
  }
};
```

## Best Practices

### 1. Tối ưu hóa Images
- Resize images trước khi upload
- Sử dụng WebP format
- Implement lazy loading

### 2. Video Processing
- Compress videos trước khi upload
- Sử dụng Cloudflare Stream cho video streaming (optional)
- Set appropriate content-type headers

### 3. Security
- KHÔNG commit credentials vào Git
- Sử dụng presigned URLs cho uploads
- Implement rate limiting
- Validate file types và sizes

### 4. Caching
- Set proper Cache-Control headers
- Leverage Cloudflare CDN
- Use ETags for cache validation

## Cloudflare Workers (Optional)

Để xử lý upload phía server và bảo mật hơn, tạo Cloudflare Worker:

```typescript
export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      const formData = await request.formData();
      const file = formData.get("file");
      
      // Upload to R2
      await env.MY_BUCKET.put(fileName, file.stream(), {
        httpMetadata: {
          contentType: file.type,
        },
      });
      
      return new Response(JSON.stringify({ success: true }));
    }
  },
};
```

## Monitoring & Analytics

1. Sử dụng Cloudflare Analytics để theo dõi:
   - Bandwidth usage
   - Request counts
   - Cache hit rates

2. Set up alerts cho storage limits

## Cost Estimation

Cloudflare R2 pricing (tham khảo):
- Storage: $0.015/GB/month
- Class A operations (writes): $4.50/million
- Class B operations (reads): $0.36/million
- No egress fees!

## Troubleshooting

### CORS Issues
Configure CORS in R2 bucket settings:
```json
{
  "AllowedOrigins": ["https://your-domain.com"],
  "AllowedMethods": ["GET", "PUT", "POST"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}
```

### Upload Failures
- Check credentials
- Verify bucket name
- Ensure file size < limit
- Check content-type headers

## Resources

- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
