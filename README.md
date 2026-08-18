# 🚀 TrabaHanap / eDiskarte Refactored Monorepo

This repository contains the refactored, standalone-MongoDB-resilient version of the **eDiskarte & TrabaHanap Admin** platform.

It has been fully audited to run natively on standard **standalone MongoDB** (without requiring replica sets or `rs0` configurations), using native MongoDB driver queries to bypass Prisma Client's standalone MongoDB limitations.

---

## 📁 Monorepo Architecture & Services

| Service Name | Description | Tech Stack | Exposed Port |
| :--- | :--- | :--- | :--- |
| **`mongodb`** | Standalone Primary Database | MongoDB 7.0 | `27017` |
| **`ediskarte-server`** | User Backend API & Socket.IO server | Node.js (Express & Prisma) | `3000` |
| **`ediskarte-client-web`** | User Web / Expo Development Server | Expo React Native Web / Mobile | `8081` |
| **`trabahanap-admin-backend`** | Admin Dashboard Backend API | Python (FastAPI & Beanie ODM) | `8000` |
| **`trabahanap-admin-frontend`** | Admin Management Portal Web UI | React + Vite + Tailwind CSS | `5173` |

---

## 🐳 Docker Deployment Guide (Zero-Config Setup)

All service configurations, database URIs (`mongodb://mongodb:27017/ediskarte`), and browser endpoints are pre-configured in `docker-compose.yml`.

If anyone downloads this repository, **they do NOT need to set up any `.env` file manually** to run the stack or view the web portals. Simply run:

```bash
docker compose up --build -d
```

### Accessing Services Out-of-the-Box:
- **Admin Portal**: `http://localhost:5173`
- **Admin Backend Docs**: `http://localhost:8000/docs`
- **User Server API**: `http://localhost:3000`
- **User Client Web**: `http://localhost:8081`

---

## 🛠️ Manual Server Setup & Local Execution Guide

If you prefer running servers manually on your host machine for development and testing, follow the steps below.

### Prerequisites
- Node.js (v20+)
- Python (v3.11+)
- Native MongoDB Service running on `localhost:27017`

---

### 1. User Backend Server (Express + Prisma)

```bash
cd ediskarte-server/app
npm install
node index.js
```
*Server runs on `http://localhost:3000` & `http://0.0.0.0:3000`*

---

### 2. User Frontend Client (Expo Mobile & Web)

#### 📱 Option A: USB ADB Reverse (Recommended for Physical Android Devices over USB)
Connect your phone via USB with USB Debugging enabled, open PowerShell/Command Prompt on your PC, and run:

1. **Configure Client Environment (`ediskarte-client/.env`)**:
   ```env
   EXPO_PUBLIC_IP_ADDRESS=127.0.0.1
   EXPO_PUBLIC_API_URL=http://127.0.0.1:3000
   ```

2. **Establish ADB Port Tunnels**:
   ```bash
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:3000 tcp:3000
   ```

3. **Start Metro Bundler**:
   ```bash
   cd ediskarte-client
   npm install
   npx expo start --dev-client --localhost --clear
   ```

4. **Connect on Phone**:
   - Open the **eDiskarte** custom development client app on your phone.
   - Tap **"Go to home"** if showing a previous connection error.
   - Type **`http://localhost:8081`** in the URL input field and tap **Connect**.

---

#### 📶 Option B: Local Wi-Fi Connection (Fixed PC IP)
1. **Configure Client Environment (`ediskarte-client/.env`)**:
   ```env
   EXPO_PUBLIC_IP_ADDRESS=192.168.1.15
   EXPO_PUBLIC_API_URL=http://192.168.1.15:3000
   ```

2. **Start Metro Bundler**:
   ```bash
   cd ediskarte-client
   npm install
   npx expo start --dev-client --clear
   ```
3. Open the **eDiskarte** app on your phone (connected to the same Wi-Fi network) to connect directly.

---

#### 🌐 Option C: Public HTTPS Tunnel Mode (localtunnel & Expo Tunnel)
If local Wi-Fi routing or USB forwarding is blocked by firewalls:

1. **Tunnel Backend API (Port 3000)**:
   ```bash
   npm install -g localtunnel
   lt --port 3000
   ```
   *(Copy generated HTTPS URL, e.g. `https://calm-oranges-bet.loca.lt`)*

2. **Update Client Environment (`ediskarte-client/.env`)**:
   ```env
   EXPO_PUBLIC_IP_ADDRESS=calm-oranges-bet.loca.lt
   EXPO_PUBLIC_API_URL=https://calm-oranges-bet.loca.lt
   ```

3. **Start Metro Bundler in Tunnel Mode**:
   ```bash
   cd ediskarte-client
   npx expo start --dev-client --tunnel --clear
   ```

---

#### 💻 Option D: Expo React Native Web (Browser Mode)
```bash
cd ediskarte-client
npm install
npx expo start --web
```
*Web version running on `http://localhost:8081`*

---

### 3. Admin Backend Server (Python FastAPI)

```bash
cd trabahanap-admin/packages/backend
pip install -r requirements.txt
python -m uvicorn admin_api.main:app --host 0.0.0.0 --port 8000
```
*API & Docs running on `http://localhost:8000/docs`*

---

### 4. Admin Frontend Server (Vite)

```bash
cd trabahanap-admin/packages/frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
*Admin Dashboard UI running on `http://localhost:5173`*

---

## 🗄️ Database Management & Studio

To inspect MongoDB collections and records visually:
```bash
cd ediskarte-server/app
npx prisma studio
```
*Prisma Studio UI running on `http://localhost:5555`*

---

## 📦 Building Standalone Mobile Release APK

To build a standalone Android `.apk` for testing on physical devices (without needing Metro running):

1. **Navigate to the Client Directory in CMD / PowerShell**:
   ```cmd
   cd C:\ediskarte\ediskarte-client
   ```

2. **Run `build_apk.ps1` based on your Network Connection**:

   - **Same Wi-Fi Network (Auto-Detect IP)**:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .\build_apk.ps1 -BuildType Release
     ```
   - **Different Network / Custom IP**:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .\build_apk.ps1 -TargetIP "192.168.X.X" -BuildType Release
     ```
   - **Windows Mobile Hotspot (`192.168.137.1`)**:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .\build_apk.ps1 -TargetIP "192.168.137.1" -BuildType Release
     ```

*The generated APK is exported directly to `C:\ediskarte\ediskarte-client\eDiskarte-<IP>.apk`.*
