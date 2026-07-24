import { initializeApp } from '@react-native-firebase/app';

const firebaseConfig = {
  // Your Firebase config object from Firebase Console
  apiKey: "AIzaSyB0VbOqSSQy6hk-h19o764D-ZvB49ZA8n4",
  projectId: "trabahanap-596e5",
  storageBucket: "trabahanap-596e5.firebasestorage.app",
  messagingSenderId: "167133441888",
  appId: "1:167133441888:android:dce4477e6224ec15e33805"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export default app;