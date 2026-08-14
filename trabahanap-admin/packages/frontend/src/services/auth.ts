import axios from "axios";

const API_BASE_URL = "http://localhost:8000"; 
const LOGIN_URL = `${API_BASE_URL}/admin/login`;
const ADMIN_ME_URL = `${API_BASE_URL}/admin/me`; 
const TOKEN_KEY = 'authToken'; 

export const login = async (email: string, password: string) => {
  const response = await axios.post(
    LOGIN_URL,
    {
      email,
      password,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  if (response.data && response.data.access_token) { 
    localStorage.setItem(TOKEN_KEY, response.data.access_token);
  } else if (response.data && response.data.token) { 
    localStorage.setItem(TOKEN_KEY, response.data.token);
  }
  return response.data; 
};

export const logoutUser = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getCurrentAdmin = async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    throw new Error("No token found"); 
  }
  try {
    const response = await axios.get(ADMIN_ME_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.data; 
  } catch (error) {
    console.error("Error fetching current admin:", error); 
    if (axios.isAxiosError(error)) {
      console.error("Axios error details - Status:", error.response?.status, "Data:", error.response?.data);
    }
    throw error; 
  }
};

export const isAuthenticated = (): boolean => {
  const token = getToken();
  return !!token; 
};
