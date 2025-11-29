# Hướng dẫn Setup Privy + Pimlico cho Fun Profile

## Bước 1: Đăng ký Privy Dashboard

1. Truy cập **[Privy Dashboard](https://dashboard.privy.io)**
2. Đăng ký/đăng nhập bằng tài khoản Google của bạn
3. Tạo một App mới:
   - Click "Create New App"
   - App Name: **Fun Profile**
   - App Type: **Web App**
   
4. Sau khi tạo xong, vào phần **Settings** của App:
   - Tìm mục **App ID** (có dạng: `clxxxxxxxxxxxxx`)
   - Copy App ID này

5. Cấu hình Login Methods:
   - Vào **Login Methods**
   - Bật: Email, Google, Farcaster, Telegram
   - Save changes

6. Cấu hình Embedded Wallets:
   - Vào **Embedded Wallets**
   - Enable: "Create embedded wallets on login"
   - Mode: "Users without wallets"
   - Save changes

7. Cấu hình Allowed Origins:
   - Vào **Settings** → **Domains**
   - Thêm domain của Fun Profile (URL từ Lovable preview)
   - Thêm `http://localhost:5173` cho local development
   - Save changes

8. Thêm Chains:
   - Vào **Chains**
   - Tìm và thêm **BNB Smart Chain (BSC)** - Chain ID: 56
   - Set làm default chain
   - Save changes

---

## Bước 2: Đăng ký Pimlico Paymaster

1. Truy cập **[Pimlico Dashboard](https://dashboard.pimlico.io)**
2. Đăng ký/đăng nhập bằng email hoặc wallet
3. Tạo Project mới:
   - Click "Create Project"
   - Project Name: **Fun Profile Paymaster**
   
4. Chọn Chain:
   - Tìm **BNB Smart Chain (BSC Mainnet)** hoặc **BSC Testnet** (khuyến nghị test trước)
   - Enable chain

5. Copy API Key:
   - Vào **API Keys**
   - Copy **API Key** (có dạng: `pim_xxxxxxxxxxxxx`)

6. Top-up Credits (optional):
   - Pimlico cung cấp **$100 free credits**
   - Nếu cần thêm, vào **Billing** để top-up

---

## Bước 3: Thêm Secrets vào Lovable

Sau khi có **PRIVY_APP_ID** và **PIMLICO_API_KEY**, bạn cần thêm vào Lovable Secrets:

### Trong Lovable Chat:
Khi được yêu cầu, điền:
- **PRIVY_APP_ID**: `clxxxxxxxxxxxxx` (từ Privy Dashboard)
- **PIMLICO_API_KEY**: `pim_xxxxxxxxxxxxx` (từ Pimlico Dashboard)

### Hoặc thủ công:
1. Tạo file `.env.local` trong project:
```env
VITE_PRIVY_APP_ID=clxxxxxxxxxxxxx
PIMLICO_API_KEY=pim_xxxxxxxxxxxxx
```

2. Thêm vào Supabase Edge Functions secrets (cho paymaster):
   - Vào [Supabase Functions Settings](https://supabase.com/dashboard/project/ubzouyvgvbgzssabrors/settings/functions)
   - Add secret: `PIMLICO_API_KEY` = `pim_xxxxxxxxxxxxx`

---

## Bước 4: Test

1. **Test Social Login**:
   - Vào trang `/auth` trong Fun Profile
   - Click "Kết nối ví"
   - Chọn "Google" hoặc "Email"
   - Xác minh login thành công

2. **Test Embedded Wallet**:
   - Sau khi login, kiểm tra xem có wallet address được tạo tự động không
   - Vào `/wallet` để xem địa chỉ ví

3. **Test External Wallet**:
   - Click "Kết nối ví" → Chọn "MetaMask"
   - Connect wallet
   - Xác minh wallet đã được liên kết

4. **Test Gasless Transaction** (sau khi có tokens):
   - Vào `/wallet`
   - Click "Send"
   - Gửi một transaction nhỏ
   - Xác minh gas = $0 (được sponsor bởi Pimlico)

---

## Tài liệu tham khảo

- [Privy Documentation](https://docs.privy.io)
- [Pimlico Documentation](https://docs.pimlico.io)
- [ERC-4337 Overview](https://eips.ethereum.org/EIPS/eip-4337)

---

## Troubleshooting

### Lỗi "Invalid App ID"
- Kiểm tra lại PRIVY_APP_ID đã được copy đúng chưa
- Kiểm tra domain đã được add vào Allowed Origins chưa

### Lỗi "Paymaster error"
- Kiểm tra PIMLICO_API_KEY đã được thêm vào Supabase secrets chưa
- Kiểm tra còn credits trong Pimlico account không
- Verify chain đã được enable trong Pimlico

### Wallet không được tạo tự động
- Kiểm tra "Embedded Wallets" settings trong Privy
- Verify mode đang là "Users without wallets"
- Check console logs để xem lỗi

---

**Liên hệ Support:**
- Privy Discord: https://discord.gg/privy
- Pimlico Discord: https://discord.gg/pimlico
