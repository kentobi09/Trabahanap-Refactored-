# 🚀 TrabaHanap / eDiskarte Refactored Monorepo

This repository contains the refactored, production-ready version of the **eDiskarte & TrabaHanap Admin** platform.

It features a fully containerized Docker architecture supporting both the **User Mobile/Web Application** and the **Admin Management Portal**, backed by MongoDB.

---

## 📁 Monorepo Architecture & Services

| Service Name | Description | Tech Stack | Exposed Port |
| :--- | :--- | :--- | :--- |
| **`mongodb`** | Primary Database (Replica set `rs0` enabled) | MongoDB 7.0 | `27017` |
| **`ediskarte-server`** | User Backend API & Socket.IO server | Node.js (Express & Prisma) | `3000` |
| **`ediskarte-client-web`** | User Web / Expo Development Server | Expo React Native Web | `8081` |
| **`trabahanap-admin-backend`** | Admin Dashboard Backend API | Python (FastAPI & Beanie ODM) | `8000` |
| **`trabahanap-admin-frontend`** | Admin Management Portal Web UI | React + Vite + Tailwind CSS | `5173` |

---

## 🐳 Docker Deployment Guide (Recommended)

### 1. Run Everything (Unified Stack)
To build and start all User and Admin services concurrently:
```bash
docker compose up --build -d
```

Check the status of running containers:
```bash
docker compose ps
```

View real-time logs for all services:
```bash
docker compose logs -f
```

Stop all services:
```bash
docker compose down
```

---

### 2. Selective Service Execution (Running User or Admin Separately)

If you prefer to run **only specific parts** (e.g., only the User backend or only the Admin portal to save system resources), Docker Compose allows starting individual services on demand:

#### Option A: Run Only User Server + Database
```bash
docker compose up --build -d mongodb mongo-init ediskarte-server
```

#### Option B: Run Only Admin Portal + Database
```bash
docker compose up --build -d mongodb mongo-init trabahanap-admin-backend trabahanap-admin-frontend
```

#### Option C: Stop a Specific Component
```bash
docker compose stop trabahanap-admin-frontend
```

---

## 📱 Mobile App (Expo / Android) Connection

To connect a physical Android device to the backend API running on your PC or inside Docker:

### 1. Configure Client `.env`
Ensure `ediskarte-client/.env` contains:
```env
EXPO_PUBLIC_IP_ADDRESS=127.0.0.1
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000
```

### 2. Establish USB ADB Reverse Tunnels
Connect your Android device via USB (with USB Debugging enabled) and run:
```powershell
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
```

### 3. Launch Dev Client on Mobile
1. Open the **eDiskarte** development app on your phone.
2. Enter `http://localhost:8081` and tap **Connect**.

---

## 🛠️ Manual / Native Local Development

If you prefer running services directly without Docker:

### 1. User Backend (Express)
```bash
cd ediskarte-server/app
npm install
npm run dev
```
*API running on `http://localhost:3000`*

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
npm run dev
```
*UI Dashboard running on `http://localhost:5173`*

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
