# 🚀 TrabaHanap / eDiskarte Refactored Monorepo

This repository contains the refactored, standalone-MongoDB-resilient version of the **eDiskarte & TrabaHanap Admin** platform.

It has been fully audited to run natively on standard **standalone MongoDB** (without requiring replica sets or `rs0` configurations), using native MongoDB driver queries to bypass Prisma Client's standalone MongoDB limitations.

---

## 📁 Monorepo Architecture & Services

| Service Name | Description | Tech Stack | Exposed Port |
| :--- | :--- | :--- | :--- |
| **`mongodb`** | Standalone Primary Database | MongoDB 7.0 | `27017` |
| **`ediskarte-server`** | User Backend API & Socket.IO server | Node.js (Express & Prisma) | `3000` |
| **`ediskarte-client-web`** | User Web / Expo Development Server | Expo React Native Web | `8081` |
| **`trabahanap-admin-backend`** | Admin Dashboard Backend API | Python (FastAPI & Beanie ODM) | `8000` |
| **`trabahanap-admin-frontend`** | Admin Management Portal Web UI | React + Vite + Tailwind CSS | `5173` |

---

## 🛠️ How to Run the Stack Natively (Recommended for Local Dev & Android Testing)

Running services directly on your host machine is the recommended method for development because it connects to your existing local MongoDB database (with all real accounts and data) and allows your physical Android phone to connect over Wi-Fi via your fixed PC IP.

### Prerequisites
- Node.js (v20+)
- Python (v3.11+)
- Native MongoDB Service running on `localhost:27017`

### 1. User Backend (Express)
```bash
cd ediskarte-server/app
npm install
node index.js
```
*Server running on `http://localhost:3000` & `http://192.168.1.15:3000`*

### 2. Admin Backend (FastAPI)
```bash
cd trabahanap-admin/packages/backend
pip install -r requirements.txt
python -m uvicorn admin_api.main:app --host 0.0.0.0 --port 8000
```
*API & Docs running on `http://localhost:8000/docs`*

### 3. Admin Frontend (Vite)
```bash
cd trabahanap-admin/node_modules/@trabahanap-admin/frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
*UI Dashboard running on `http://localhost:5173`*

---

## 📱 Mobile App (Android Wi-Fi Connection)

### 1. Configure Client Environment
Update `ediskarte-client/.env` with your PC's fixed Wi-Fi IP address:
```env
EXPO_PUBLIC_IP_ADDRESS=192.168.1.15
EXPO_PUBLIC_API_URL=http://192.168.1.15:3000
```

### 2. Connect Mobile App
Open the **eDiskarte** custom development client app on your Android phone connected to the same Wi-Fi network. It will automatically communicate with `http://192.168.1.15:3000`.

---

## 🐳 Docker Deployment Guide

If deploying to a server environment or running isolated containers:

### 1. Start All Services
```bash
docker compose up --build -d
```

### 2. Selective Execution (Targeted Services)
```bash
# Run only User backend and DB
docker compose up -d mongodb ediskarte-server

# Run only Admin portal and DB
docker compose up -d mongodb trabahanap-admin-backend trabahanap-admin-frontend
```

---

## 🗄️ Database Management & Studio
To inspect data using Prisma Studio:
```bash
cd ediskarte-server/app
npx prisma studio
```

---

## 📦 Building Mobile Release APK
```bash
cd ediskarte-client/android
.\gradlew clean
.\gradlew assembleRelease
```
*APK binary generated at `ediskarte-client/android/app/build/outputs/apk/release/app-release.apk`*
