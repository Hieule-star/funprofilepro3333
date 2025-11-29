# Camly Fun - Nền tảng Mạng Xã Hội Web3

Một nền tảng mạng xã hội Web3 hiện đại với tích hợp crypto, blockchain và cộng đồng sôi động.

## ✨ Tính năng chính

- **Feed mạng xã hội**: Đăng bài, tương tác, bình luận và reactions
- **Hệ thống bạn bè**: Kết nối với cộng đồng Web3
- **Ví Crypto**: Quản lý CAMLY token và nhận thưởng
- **Honor Board**: Theo dõi thành tích và phần thưởng
- **Trending Topics**: Khám phá các chủ đề hot về crypto, blockchain, NFT
- **Responsive Design**: Hoạt động mượt mà trên mọi thiết bị

## 🚀 Công nghệ sử dụng

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Routing**: React Router v6
- **Fonts**: Inter & Space Grotesk
- **Media Storage**: Cloudflare R2 (xem [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md))

## 📦 Cài đặt

```bash
# Clone repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev
```

## ⚙️ Cấu hình Cloudflare R2

Để sử dụng tính năng upload ảnh và video, vui lòng xem hướng dẫn chi tiết tại [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md).

Tóm tắt:
1. Tạo R2 bucket trên Cloudflare
2. Lấy API credentials
3. Tạo file `.env.local` với các biến môi trường cần thiết
4. Cài đặt AWS SDK: `npm install @aws-sdk/client-s3`

## 🎨 Design System

Ứng dụng sử dụng một design system tùy chỉnh với:
- Màu chủ đạo: Green (#22c55e) & Yellow (#f59e0b)
- Dark mode tích hợp sẵn
- Animations mượt mà với framer-motion
- Semantic color tokens cho khả năng tùy biến cao

## 📱 Các trang chính

- `/` - Feed (Trang chủ)
- `/friends` - Bạn bè
- `/profile` - Hồ sơ cá nhân
- `/wallet` - Ví crypto

## 🔐 Bảo mật

- Không lưu credentials trong code
- Sử dụng environment variables
- Implement rate limiting cho API calls
- Validate file uploads (type & size)

## 📄 License

MIT License

---
