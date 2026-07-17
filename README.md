# Valorant Daily Store Checker & Notification System

A local dashboard for managing multiple Riot accounts, checking Valorant daily storefronts, matching shop offers with custom wishlists, and sending push notifications via `ntfy.sh`.

---

## 🧩 Overview

This repository contains:
- `backend/`: Express API server, Riot auth integration, MongoDB persistence, scheduled storefront checks
- `frontend/`: React + Vite dashboard UI for account management, wishlist editing, and storefront review

---

## ✅ Features

- Multi-account Valorant storefront monitoring
- Wishlist-based notification alerts
- Riot token mode and credential mode support
- Daily shop fetch scheduling with configurable cron
- Push notifications through `ntfy.sh`
- Vietnamese / English UI support

---

## 🚀 Setup

### Requirements
- Node.js v18+
- MongoDB running locally or accessible via `MONGO_URI`

### Install dependencies

From the repository root:
```bash
npm run install:all
```

### Run in development

Start both backend and frontend together:
```bash
npm run dev
```

Backend only:
```bash
npm run dev:backend
```

Frontend only:
```bash
npm run dev:frontend
```

---

## 🔧 Environment Configuration

Create a file at `backend/.env` and add the following values.

```dotenv
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/valo-check
JWT_SECRET=super_secret_valorant_dashboard_key_123!
# 32-byte hex key for AES-256-GCM (64 characters)
ENCRYPTION_KEY=
# Sharp: ap (Asian Pacific), eu (Europe), na (North America), kr (Korea), ...
DEFAULT_SHARD=ap
# 07:05 AM in your Timezone
CRON_SCHEDULE=5 7 * * *
TIMEZONE=Asia/Ho_Chi_Minh
```

### Notes
- `JWT_SECRET`: use a strong, unique secret in production
- `ENCRYPTION_KEY`: must be a 32-byte hex string (64 characters) for AES-256-GCM
- `DEFAULT_SHARD`: default shard used when account shard resolution fails
- `CRON_SCHEDULE`: cron expression for daily storefront checks
- `TIMEZONE`: timezone used by the cron scheduler

---

## 🧪 Common commands

- `npm run dev` — run backend and frontend together
- `npm run dev:backend` — start backend server only
- `npm run dev:frontend` — start frontend dev server only
- `npm run start:backend` — run backend in production mode
- `npm run start:frontend` — build and preview frontend

---

## 📁 Folder structure

- `backend/` — API, models, services, jobs, routes
- `frontend/` — React app, components, styles
- `package.json` — root scripts and workspace management

---

## 🔐 Security

- Passwords and credentials are encrypted before storage
- Riot authentication is performed via direct Riot API interactions
- The app does not hardcode sensitive keys in source code
