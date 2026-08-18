# Valorant Store Checker

## Demo

![Demo](assets/demo.gif)

---

## Vietnamese below
## 🇺🇸 English

A simple Riot-based storefront checker that works in a single flow: the user opens the Riot login page, pastes the returned URL, and the app fetches the current storefront for that session. The application not stores Riot account credentials.
---

## 🧩 Overview

This repository contains:

- `backend/` — Express API, Riot authentication token parsing, storefront retrieval, and admin log persistence.
- `frontend/` — React + Vite application with a 3-step Riot login flow and an admin logs page.

---

## ✅ Current Workflow

1. Open the Riot login page from the application.
2. Sign in to your Riot account.
3. Copy the redirect URL from the browser's address bar.
4. Paste the URL into the application and click **Login**.
5. The application retrieves and displays:
   - Daily Store
   - Featured Bundle
   - Night Market
   - Accessory Store
6. After a successful request, the backend stores a log containing the Riot ID and timestamp for the admin dashboard.

## 🎯 Features

- **Daily Store Monitoring**: Automatically checks and displays daily Valorant store items
- **Wishlist System**: Add skins to your wishlist and get notified when they appear in the shop
- **Discord Webhook Integration**: Configure Discord webhooks to receive notifications when wishlist skins are available
- **Ntfy.sh Push Notifications**: Set up Ntfy topics for mobile push notifications
- **Daily Discord Skin List**: Automatically sends daily skin lists to configured Discord channels
- **Multi-language Support**: Available in English and Vietnamese
- **Admin Dashboard**: View user logs and manage accounts
- **Secure Authentication**: JWT-based auth with encrypted data storage

---

## 🚀 Setup

### Requirements

- Node.js 18+
- MongoDB (local or remote)

### Install Dependencies

From the project root:

```bash
npm run install:all
```

### Run Development Server

```bash
npm run dev
```

---

## 🔧 Environment Variables

Create `backend/.env`:

```dotenv
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/valo-check
JWT_SECRET=super_secret_valorant_dashboard_key_123!
ENCRYPTION_KEY=your-64-char-hex-key
ADMIN_SECRET=valo-admin-secret

# Shop share images
PUBLIC_SITE_URL=https://valocheck.vercel.app
PUBLIC_API_URL=https://api.your-backend-host
SHOP_IMAGE_CACHE_MB=128
SHOP_IMAGE_FETCH_CONCURRENCY=6
SHARE_STATS_FLUSH_MS=60000
TRUST_PROXY_HOPS=1
```

On Vercel (frontend project) set the same `PUBLIC_API_URL` and `PUBLIC_SITE_URL`
so the `/s/:id` serverless function can build absolute `og:image` URLs.

### Notes

- `JWT_SECRET` should be replaced with a strong secret in production.
- `PUBLIC_API_URL` must point at the backend origin: share links live on the site
  domain but their images are served by the backend.
- `SHOP_IMAGE_CACHE_MB` caps total RAM used by the three image caches
  (raw downloads, resized pixels, rendered images). Lower it on small VPS plans.
- `TRUST_PROXY_HOPS` must match how many reverse proxies sit in front of the API
  (nginx = 1, nginx behind Cloudflare = 2). Set it to `0` only when Node is exposed
  directly. If it is wrong, rate limiting buckets every visitor under the proxy IP.

---

## 🖼️ Shop Share Images

Every store section (daily store, night market, featured bundle, accessory store)
has a **Share** button that renders a branded image of the shop.

- `backend/services/shopImageService.js` renders the image with `sharp`. The same
  renderer feeds the web share button, the daily Discord webhook, and share links,
  so a skin appearing in many accounts is downloaded and resized only once.
- Riot ID is **hidden by default** and only drawn when the user opts in. It is never
  persisted unless that toggle is on.
- Only `*.valorant-api.com` image hosts are fetched (the storefront payload comes
  from the client, so this is an SSRF guard).
- `POST /api/share/snapshot` stores just the normalized item metadata (~2KB/doc),
  never image buffers, and expires after 30 days via a TTL index.
- `frontend/api/s/[id].js` is a Vercel serverless function that serves `/s/:id`
  with real `og:` tags — the SPA rewrite alone cannot do this, so crawlers on
  Facebook/Discord/Zalo would otherwise see no preview image.

---

## 🧪 Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run backend and frontend together |
| `npm run dev:backend` | Run backend only |
| `npm run dev:frontend` | Run frontend only |

---

## 📁 API Endpoints

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/store/check` | Check the Riot storefront using the redirect URL |
| POST | `/api/logs` | Save a successful storefront lookup log |
| GET | `/api/admin/logs` | Retrieve admin logs |
| POST | `/api/share/image` | Render a shop image and return the bytes |
| POST | `/api/share/variants` | List store sections worth sharing |
| POST | `/api/share/snapshot` | Create a 30-day share link |
| GET | `/api/share/s/:id` | Share link metadata (used by the OG page) |
| GET | `/api/share/s/:id/image` | Feed image (1080px, vertical) for a share link |
| GET | `/api/share/s/:id/og` | 1200x630 preview image for a share link |
| GET | `/api/share/stats` | Share funnel counters (admin only) |

---

## 🔐 Security

- Riot account credentials are **not** stored in the application.

---

# 🇻🇳 Tiếng Việt

Ứng dụng kiểm tra cửa hàng Valorant theo quy trình đơn giản: người dùng mở trang đăng nhập Riot, sao chép URL sau khi đăng nhập và dán vào ứng dụng để lấy thông tin cửa hàng trong phiên hiện tại. Ứng dụng không lưu thông tin tài khoản Riot Games

---

## 🧩 Tổng quan

Repository gồm hai phần:

- `backend/` — API Express, phân tích token Riot, lấy dữ liệu cửa hàng và lưu nhật ký quản trị.
- `frontend/` — Giao diện React + Vite với quy trình đăng nhập Riot gồm 3 bước và trang xem nhật ký quản trị.

---

## ✅ Quy trình hoạt động

1. Mở trang đăng nhập Riot từ ứng dụng.
2. Đăng nhập tài khoản Riot.
3. Sao chép URL sau khi đăng nhập từ thanh địa chỉ trình duyệt.
4. Dán URL vào ứng dụng và nhấn **Đăng nhập**.
5. Ứng dụng sẽ lấy và hiển thị:
   - Cửa hàng hằng ngày (Daily Store)
   - Gói nổi bật (Featured Bundle)
   - Chợ đêm (Night Market)
   - Cửa hàng phụ kiện (Accessory Store)
6. Sau khi lấy dữ liệu thành công, backend sẽ lưu Riot ID và thời gian truy cập để hiển thị trên trang quản trị.

## 🎯 Tính năng

- **Giám sát cửa hàng hàng ngày**: Tự động kiểm tra và hiển thị các vật phẩm cửa hàng Valorant hàng ngày
- **Hệ thống Wishlist**: Thêm skin vào danh sách mong muốn và nhận thông báo khi xuất hiện trong shop
- **Tích hợp Discord Webhook**: Cấu hình webhook Discord để nhận thông báo khi có skin trong wishlist
- **Thông báo đẩy Ntfy.sh**: Thiết lập topic Ntfy để nhận thông báo trên điện thoại
- **Danh sách skin hàng ngày trên Discord**: Tự động gửi danh sách skin hàng ngày vào kênh Discord đã cấu hình
- **Hỗ trợ đa ngôn ngữ**: Có sẵn tiếng Anh và tiếng Việt
- **Dashboard quản trị**: Xem nhật ký người dùng và quản lý tài khoản
- **Xác thực bảo mật**: Xác thực JWT với lưu trữ dữ liệu mã hóa

---

## 🚀 Cài đặt

### Yêu cầu

- Node.js 18 trở lên
- MongoDB chạy cục bộ hoặc máy chủ từ xa

### Cài đặt thư viện

Tại thư mục gốc của dự án:

```bash
npm run install:all
```

### Chạy ở môi trường phát triển

```bash
npm run dev
```

---

## 🔧 Biến môi trường

Tạo file `backend/.env`:

```dotenv
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/valo-check
JWT_SECRET=super_secret_valorant_dashboard_key_123!
ENCRYPTION_KEY=your-64-char-hex-key
ADMIN_SECRET=valo-admin-secret
```

### Lưu ý

- `JWT_SECRET` nên được thay bằng chuỗi bí mật mạnh khi triển khai thực tế.


---

## 🧪 Các lệnh thường dùng

| Lệnh | Chức năng |
|------|-----------|
| `npm run dev` | Chạy đồng thời backend và frontend |
| `npm run dev:backend` | Chỉ chạy backend |
| `npm run dev:frontend` | Chỉ chạy frontend |

---

## 📁 API chính

| Method | Endpoint | Mô tả |
|---------|----------|-------|
| POST | `/api/store/check` | Kiểm tra cửa hàng Valorant từ URL Riot |
| POST | `/api/logs` | Lưu nhật ký sau khi lấy cửa hàng thành công |
| GET | `/api/admin/logs` | Lấy danh sách nhật ký quản trị |

---

## 🔐 Bảo mật

- Hệ thống **không lưu** thông tin đăng nhập Riot.