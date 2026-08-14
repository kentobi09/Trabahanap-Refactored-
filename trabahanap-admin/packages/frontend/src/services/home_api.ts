import axios from "axios";

const BASE_URL = "http://localhost:8000/admin";

// Endpoint URLs
const url = `${BASE_URL}/get_total_users`;
const urlJobs = `${BASE_URL}/get_total_jobs`;
const urlApplicants = `${BASE_URL}/get_total_applicants`;
const urlMonthlyApplications = `${BASE_URL}/get_monthly_applications`;
const urlMonthlyUsers = `${BASE_URL}/get_monthly_users`;

// Get total counts
export const getTotalUsers = async () => {
  const response = await axios.get(url);
  return response.data;
};

export const getTotalJobs = async () => {
  const response = await axios.get(urlJobs);
  return response.data;
};

export const getTotalApplicants = async () => {
  const response = await axios.get(urlApplicants);
  return response.data;
};

// Get monthly data for charts
export const getMonthlyApplications = async () => {
  try {
    const response = await axios.get(urlMonthlyApplications);
    return response.data;
  } catch (error) {
    console.error("Error fetching monthly applications:", error);
    return { monthly_data: [] };
  }
};

export const getMonthlyUsers = async () => {
  try {
    const response = await axios.get(urlMonthlyUsers);
    return response.data;
  } catch (error) {
    console.error("Error fetching monthly users:", error);
    return { monthly_data: [] };
  }
};
