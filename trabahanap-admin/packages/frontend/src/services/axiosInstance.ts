import axios from "axios";

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return "";
};
const API_BASE_URL = getApiBaseUrl();

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
