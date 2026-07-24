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

## Connecting to the Server
1. Check your IP address using these commands

Windows (Check IPv4 Address )
```sh
ipconfig
```
Mac
```sh
ipconfig getifaddr en0
```

Linux (Unsure of this)
```
ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1'
```



2. Create a .env file on the root folder with this format
```sh
EXPO_PUBLIC_IP_ADDRESS=<<IP ADDRESS OF YOUR LAPTOP/DESKTOP>>
```


## 📌 Future Enhancements
- 🏆 AI-powered job recommendations
- 🌎 Multi-language support
- 💳 Integrated payment system

## 📬 Contributing
We welcome contributions! Feel free to submit issues or pull requests to help improve eDiskarte.

---
