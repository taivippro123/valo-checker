# Valorant Store Checker

## Vietnamese below
## 🇺🇸 English

A simple Riot-based storefront checker that works in a single flow: the user opens the Riot login page, pastes the returned URL, and the app fetches the current storefront for that session. The application not stores Riot account credentials.
---

## Demo

![Demo](assets/demo.gif)

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
```

### Notes

- `JWT_SECRET` should be replaced with a strong secret in production.

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