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

### 2. Run the Expo Client (With Public HTTPS Tunneling)
When developing on physical Android devices, local loopback/USB forwarding (`localhost`) or local Wi-Fi IP routing can be blocked by firewalls or device-specific network rules. 

To bypass this, we use secure public tunnels for both the **Backend** and the **Metro Bundler**.

#### Step A: Tunnel the Backend API (Port 3000)
Run `localtunnel` globally to generate a public HTTPS URL for your backend server:
```bash
npm install -g localtunnel
lt --port 3000
```
This will output a URL like:
`your url is: https://calm-oranges-bet.loca.lt`

#### Step B: Update Client Environment Config
Create/update `ediskarte-client/.env` and insert the generated localtunnel domain and URL:
```env
EXPO_PUBLIC_IP_ADDRESS=calm-oranges-bet.loca.lt
EXPO_PUBLIC_API_URL=https://calm-oranges-bet.loca.lt
```

#### Step C: Run Metro Bundler in Tunnel Mode
Start the Expo client with the `--tunnel` option to generate a secure ngrok tunnel:
```bash
cd ediskarte-client
npm install
npx expo start --dev-client --tunnel --clear
```
This will generate a tunnel URL like `https://ml4jdkm-anonymous-8081.exp.direct`.

#### Step D: Launch on Physical Phone
Connect your phone via USB with USB debugging enabled, and open the Expo Development Client. You can launch the tunnel on your phone by running:
```bash
adb shell am start -a android.intent.action.VIEW -d "exp+ediskarte://expo-development-client/?url=https%3A%2F%2Fml4jdkm-anonymous-8081.exp.direct"
```
*(Replace `ml4jdkm-anonymous-8081.exp.direct` with your active Expo tunnel URL)*

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
