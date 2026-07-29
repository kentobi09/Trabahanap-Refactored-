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

### 📲 Building the APK for Local Testing
If you want to run the app on physical Android devices using your laptop as the local server, you can use the automated build script. It configures the endpoint configurations, builds a standalone release APK, and restores the codebase state automatically.

#### Option A: Windows Mobile Hotspot (Recommended - bypasses router blocking)
If your WiFi router has AP/Client isolation enabled (common on home, mesh, or school networks), devices won't be able to communicate. You can bypass this by turning on your laptop's **Mobile Hotspot**:
1. On your Windows laptop, go to **Settings > Network & Internet > Mobile Hotspot** and turn it **On**.
2. Connect your testing phone(s) to this hotspot.
3. Your laptop's IP on this network is always **`192.168.137.1`**.
4. Open PowerShell in the client folder and run:
   ```powershell
   .\build_apk.ps1 -TargetIP 192.168.137.1
   ```
5. Install the resulting **`eDiskarte-192.168.137.1.apk`** on the phone.

#### Option B: Normal local WiFi network
If your router allows local device communication:
1. Make sure your phone is connected to the same WiFi network as your laptop.
2. Open PowerShell in the client folder and run:
   ```powershell
   .\build_apk.ps1
   ```
   *(The script will auto-detect your current WiFi IP)*
3. Install the resulting **`eDiskarte-<WiFi_IP>.apk`** on the phone.

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
