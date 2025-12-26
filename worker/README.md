# 🚀 Media Gateway Worker

Cloudflare Worker làm CDN gateway cho R2 bucket `fun-media`.

**Domain**: `media.richkid.cloud`

## 📋 Tính năng

- ✅ **R2 Binding**: Không cần access key, bảo mật hơn, latency thấp
- ✅ **Edge Caching**: Media được cache 30 ngày tại edge
- ✅ **Browser Caching**: Cache 1 ngày với immutable flag
- ✅ **CORS**: Cho phép truy cập từ mọi domain
- ✅ **Range Requests**: Hỗ trợ video streaming với byte-range
- ✅ **ETag**: Hỗ trợ conditional requests
- 🔜 **Image Resizing**: TODO - cần Cloudflare Images subscription

## 🛠️ Cài đặt

```bash
# Cài Wrangler CLI (nếu chưa có)
npm install -g wrangler

# Vào thư mục worker
cd worker

# Cài dependencies
npm install
```

## 🔐 Login Cloudflare

```bash
# Login vào Cloudflare account
wrangler login
```

## 🚀 Deploy

```bash
# Deploy worker lên Cloudflare
wrangler deploy

# Hoặc dùng npm script
npm run deploy
```

## 🌐 Gắn Custom Domain

1. Vào **Cloudflare Dashboard** → **Workers & Pages**
2. Chọn worker **`media-gateway`**
3. Tab **"Settings"** → **"Triggers"**
4. Phần **"Custom Domains"** → Click **"Add Custom Domain"**
5. Nhập domain: **`media.richkid.cloud`**
6. Cloudflare sẽ tự động cấu hình DNS

> **Lưu ý**: Domain `richkid.cloud` phải được quản lý bởi Cloudflare DNS.

## 📖 Sử dụng

### Truy cập media

```
GET https://media.richkid.cloud/{path-to-object}
```

### Ví dụ

```bash
# Ảnh
https://media.richkid.cloud/images/avatar.jpg
https://media.richkid.cloud/posts/1234/photo.png

# Video
https://media.richkid.cloud/videos/intro.mp4

# File bất kỳ
https://media.richkid.cloud/documents/report.pdf
```

### Headers trả về

| Header | Value |
|--------|-------|
| `Cache-Control` | `public, max-age=86400, s-maxage=2592000, immutable` |
| `Access-Control-Allow-Origin` | `*` |
| `ETag` | Object ETag từ R2 |
| `Accept-Ranges` | `bytes` |
| `Content-Type` | Từ R2 metadata |

## 🎬 Video Streaming

Worker hỗ trợ HTTP Range requests cho video streaming:

```bash
# Request với Range header
curl -H "Range: bytes=0-1023" https://media.richkid.cloud/videos/intro.mp4
```

Response sẽ có status `206 Partial Content` với header `Content-Range`.

## 🔧 Development

```bash
# Chạy local development server
npm run dev

# Xem logs real-time
npm run tail
```

## 📊 Monitoring

Xem metrics và logs tại:
- **Cloudflare Dashboard** → **Workers & Pages** → **media-gateway** → **Metrics/Logs**

## 🔜 TODO: Image Resizing

Khi có Cloudflare Images subscription, có thể bật Image Resizing:

```
# Resize ảnh
https://media.richkid.cloud/images/photo.jpg?w=300&h=200

# Chuyển format
https://media.richkid.cloud/images/photo.jpg?format=webp
```

Query params hỗ trợ:
- `w` - Width (pixels)
- `h` - Height (pixels)
- `format` - Output format (`webp`, `avif`, `auto`)

> Xem comment trong `src/index.ts` để bật tính năng này.

## 📁 Cấu trúc thư mục

```
worker/
├── src/
│   └── index.ts      # Worker code chính
├── wrangler.toml     # Cấu hình Cloudflare Worker
├── package.json      # Dependencies
├── tsconfig.json     # TypeScript config
└── README.md         # File này
```

## ⚠️ Lưu ý quan trọng

1. **R2 Bucket**: Đảm bảo bucket `fun-media` đã tồn tại trong Cloudflare R2
2. **Upload**: Worker này chỉ phục vụ đọc (GET/HEAD), không hỗ trợ upload
3. **Upload flow**: Tiếp tục dùng presigned URL từ Edge Function để upload lên R2
4. **DNS**: Domain phải được quản lý bởi Cloudflare

## 🔗 Links

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [R2 Bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
