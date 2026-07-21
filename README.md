# Valorant Store Checker

A simple Riot-based storefront checker that works in a single flow: user opens the Riot login page, pastes the returned URL, and the app fetches the current storefront once for that session. The app no longer stores long-term Riot accounts, does not run cron jobs, and does not use wishlist or ntfy features.

---

## Demo

![Demo](assets/demo.gif)

---

## 🧩 Overview

This repository now contains:
- `backend/`: Express API, Riot auth token parsing, storefront fetch, admin logs persistence
- `frontend/`: React + Vite UI with a 3-step Riot URL flow and an admin logs page

---

## ✅ Current flow

1. Open the Riot login page from the app.
2. Log in inside that browser tab.
3. Copy the resulting URL from the address bar.
4. Paste the URL into the app and click “Đăng nhập”.
5. The app fetches the storefront once and displays the daily shop, featured bundle, night market, and accessory store sections.
6. After a successful fetch, the backend stores a log entry with the Riot ID and timestamp for the admin logs page.

---

## 🚀 Setup

### Requirements
- Node.js 18+
- MongoDB running locally or accessible via `MONGO_URI`

### Install dependencies

From the repository root:
```bash
npm run install:all
```

### Run in development

```bash
npm run dev
```

---

## 🔧 Environment Configuration

Create a file at `backend/.env` with values such as:

```dotenv
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/valo-check
JWT_SECRET=super_secret_valorant_dashboard_key_123!
ENCRYPTION_KEY=your-64-char-hex-key
ADMIN_SECRET=valo-admin-secret
```

### Notes
- `JWT_SECRET` should be a strong secret in production.
- `ENCRYPTION_KEY` is still kept for compatibility, though the new flow no longer stores long-term account credentials.
- `ADMIN_SECRET` is used for the admin logs endpoint when needed.

---

## 🧪 Common commands

- `npm run dev` — run backend and frontend together
- `npm run dev:backend` — start backend only
- `npm run dev:frontend` — start frontend only

---

## 📁 Main routes

- `POST /api/store/check` — accepts a Riot redirect URL and returns storefront data
- `POST /api/logs` — creates a log entry after a successful storefront fetch
- `GET /api/admin/logs` — returns admin logs for the admin page

---

## 🔐 Security

- No long-term Riot account storage is required for the new flow.
- Admin access is protected by the standard JWT auth plus the admin secret check for the logs endpoint.
