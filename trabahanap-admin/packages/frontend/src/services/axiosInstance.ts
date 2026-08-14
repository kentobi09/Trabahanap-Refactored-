import axios from "axios";

// Hardcoded API base URL
const API_BASE_URL = "http://localhost:8000";

const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/admin`, // All admin routes are prefixed with /admin
});

axiosInstance.interceptors.request.use(
  (config) => {
    // Retrieve the token from localStorage using the correct key
    const token = localStorage.getItem("authToken"); // Changed key here
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
