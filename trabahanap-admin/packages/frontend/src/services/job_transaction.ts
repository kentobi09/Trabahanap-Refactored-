import axios from "axios";

// Define the base URL for your API
// Vite exposes env variables on import.meta.env
// Make sure your .env file has VITE_API_URL=http://your_api_url
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/admin";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include the token for authenticated routes
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken"); // Or your preferred token storage method
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export enum JobStatusEnum {
  OPEN = "open",
  PENDING = "pending",
  COMPLETED = "completed",
  REVIEWED = "reviewed",
}

export interface Job {
  _id: string;
  clientId: string;
  jobTitle: string;
  jobDescription: string;
  category: string;
  jobLocation: string;
  jobStatus: JobStatusEnum;
  budget: string;
  jobDuration: string;
  jobImage: string[];
  applicantCount: number;
  datePosted: string; // ISO date string
  acceptedAt?: string; // ISO date string
  completedAt?: string; // ISO date string
  verifiedAt?: string; // ISO date string
  jobRating?: number;
  jobReview?: string;
  jobSeekerId?: string;
  offer?: string;
}

export const getAllJobRequests = async (): Promise<Job[]> => {
  try {
    const response = await apiClient.get<Job[]>("/api/job_requests/");
    return response.data;
  } catch (error) {
    console.error("Error fetching all job requests:", error);
    // Consider more robust error handling or re-throwing for the component to handle
    throw error;
  }
};

export const getJobRequestById = async (jobId: string): Promise<Job> => {
  try {
    const response = await apiClient.get<Job>(`/api/job_requests/${jobId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching job request with ID ${jobId}:`, error);
    // Consider more robust error handling or re-throwing for the component to handle
    throw error;
  }
};
