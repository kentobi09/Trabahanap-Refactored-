# eDiskarte

## 📌 Overview
**eDiskarte** is a mobile application prototype designed to bridge the gap between local service providers and customers. It serves as a digital marketplace where workers can showcase their skills, and clients can easily find reliable services within their community. This platform enhances employment opportunities and simplifies service coordination using modern technology.

## 🚀 Features
- 📍 **Local Job Matching** – Connects service providers with customers in their area.
- 🔍 **Service Listings** – Allows workers to showcase their skills and expertise.
- 📅 **Seamless Booking** – Simplifies the process of hiring and scheduling jobs.
- ⭐ **User Ratings & Reviews** – Ensures reliability and trust between users.
- 📲 **Mobile-Friendly** – Designed for easy access and usability on smartphones.

## 🏗️ Technologies Used
- **Frontend:** React Native
- **Backend:** Node.js with Express
- **Database:** MongoDB
- **Authentication:** OAuth

## 🔧 Installation & Setup
1. Clone the repository:
   ```sh
   git clone https://github.com/Tres-cyber/eDiskarte.git
   ```
2. Navigate to the project folder:
   ```sh
   cd eDiskarte
   ```
3. Install dependencies:
   ```sh
   npm install
   ```
4. Run the application:
   ```sh
   npm start
   ```

## Connecting to the Server (Local Deployment)

### 📲 Building the APK for Local Testing & Different Networks
If you want to run the app on physical Android devices using your laptop as the local server, you can use the automated build script `build_apk.ps1`. It auto-detects your network IP (or accepts a custom target IP), inlines it across all client API endpoints, builds the standalone APK, and restores the codebase state automatically.

#### 1. Navigate to the Client Directory in CMD / PowerShell
Open Command Prompt (`cmd.exe`) or PowerShell on your laptop and navigate to the `ediskarte-client` folder:
```cmd
cd C:\ediskarte\ediskarte-client
```

#### 2. Build the APK based on your Network Connection

##### 📶 Option A: Auto-Detect Wi-Fi IP (Same Network)
If your phone and laptop are connected to the same Wi-Fi network:
```powershell
powershell -ExecutionPolicy Bypass -File .\build_apk.ps1 -BuildType Release
```
*(The script auto-detects your active Wi-Fi IPv4 address and exports `eDiskarte-<IP>.apk` directly into `C:\ediskarte\ediskarte-client`)*.

##### 📡 Option B: Connecting to a Different Network / Custom IP
If you switch to a different Wi-Fi network, router, or hotspot and want to specify the target laptop IP manually:
```powershell
powershell -ExecutionPolicy Bypass -File .\build_apk.ps1 -TargetIP "192.168.X.X" -BuildType Release
```
*(Replace `192.168.X.X` with your laptop's IPv4 address on that network)*.

##### 📱 Option C: Windows Mobile Hotspot (Bypasses Router Blocking)
If your Wi-Fi router has Client/AP Isolation enabled (common on public or school Wi-Fi), devices cannot talk to each other directly. Use Windows Mobile Hotspot instead:
1. Turn on **Mobile Hotspot** in Windows (**Settings > Network & Internet > Mobile Hotspot**).
2. Connect your Android phone to your laptop's Wi-Fi hotspot.
3. Your laptop's IP on Mobile Hotspot is always **`192.168.137.1`**.
4. Run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\build_apk.ps1 -TargetIP "192.168.137.1" -BuildType Release
   ```
5. Install **`eDiskarte-192.168.137.1.apk`** on your phone.

### 🛠️ Manual Configuration (Development Mode)
1. Check your IP address:
   * **Windows:** Run `ipconfig` (look for Wireless LAN adapter Wi-Fi IPv4 Address)
   * **Mac:** Run `ipconfig getifaddr en0`

2. Create a `.env` file in the root folder:
   ```env
   EXPO_PUBLIC_IP_ADDRESS=192.168.1.15
   EXPO_PUBLIC_API_URL=http://192.168.1.15:3000
   ```


## 📌 Future Enhancements
- 🏆 AI-powered job recommendations
- 🌎 Multi-language support
- 💳 Integrated payment system

## 📬 Contributing
We welcome contributions! Feel free to submit issues or pull requests to help improve eDiskarte.

---
