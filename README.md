# TrabaHanap / eDiskarte Refactored Monorepo

This repository contains the refactored, standalone-MongoDB-resilient version of the **eDiskarte** project. It has been audited to run without requiring a replica set (using native MongoDB queries where necessary to bypass Prisma Client's standalone MongoDB limitations).

## 📁 Repository Structure
- **`ediskarte-server`**: Express API & Socket.IO backend (Port 3000)
- **`ediskarte-client`**: Expo React Native mobile application (Port 8081)
- **`trabahanap-admin`**: FastAPI backend (Port 8000) & React / Vite frontend (Port 5173)

---

## 🚀 How to Run the Backend & Client Locally

### Prerequisites
- Node.js (v20+ recommended)
- MongoDB running locally on port `27017`

### 1. Run the Express Backend
```bash
cd ediskarte-server/app
npm install
npm run dev
```
The server will start on `http://localhost:3000`.

### 2. Run the Expo Client (USB ADB Reverse)
To connect your physical Android device to both the local Metro bundler and the Express server, use the USB ADB reverse forwarding method.

#### Step A: Configure Client Environment
Create/update `ediskarte-client/.env` and insert the local loopback configurations:
```env
EXPO_PUBLIC_IP_ADDRESS=127.0.0.1
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000
```

#### Step B: Establish ADB Port Tunnels
Connect your phone via USB with USB Debugging enabled, open PowerShell on your PC, and run the following commands to bridge the connections:
```powershell
& "C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe" reverse tcp:8081 tcp:8081
& "C:\Users\LENOVO\AppData\Local\Android\Sdk\platform-tools\adb.exe" reverse tcp:3000 tcp:3000
```

#### Step C: Start Metro Bundler
Start the Metro server bound to localhost:
```bash
cd ediskarte-client
npm install
npx expo start --dev-client --localhost --clear
```

#### Step D: Connect on Physical Phone
1. Open the **eDiskarte** custom development client app on your phone.
2. Tap **"Go to home"** (if showing a previous connection error).
3. Type **`http://localhost:8081`** in the URL input field and tap **Connect**.

---

## 🛠️ How to Run the Admin Panel (FastAPI + React)

### 1. Admin Backend (Python FastAPI)
Make sure Python is installed.
```bash
cd trabahanap-admin/packages/backend
pip install -r requirements.txt
python -m uvicorn admin_api.main:app --host 0.0.0.0 --port 8000
```
The API documentation will be available at `http://localhost:8000/docs`.

### 2. Admin Frontend (Vite)
```bash
cd trabahanap-admin/node_modules/@trabahanap-admin/frontend
npm install
npm run dev

```
The frontend dashboard will be available at `http://localhost:5173`.

## Peek Database
```bash
cd C:\ediskarte\ediskarte-server\app>
npx prisma studio
```

## Export app as apk
```bash
cd C:\ediskarte\ediskarte-client\android
# if updating the app with changes
.\gradlew clean
# Build/rebuilding the app
.\gradlew assembleRelease
```
## Docker run


