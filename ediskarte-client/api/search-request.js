import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Search for job seekers based on query string and optional filters
 * @param {string} query - The search query (name, skill, etc.)
 * @param {object} options - Additional search options
 * @param {string} [options.category] - Optional category filter (plumbing, electrical, etc.)
 * @param {number} [options.page] - Optional page number for pagination
 * @param {number} [options.limit] - Optional items per page
 * @returns {Promise<{data: Array<object>, pagination: object}>} - Object containing job seekers array and pagination info
 */
export const searchJobSeekers = async (query, options = {}) => {
  try {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      throw new Error("Authentication token not found");
    }

    const params = { query };

    if (options.category) {
      params.category = options.category;
    }

    if (options.page) {
      params.page = options.page;
    }

    if (options.limit) {
      params.limit = options.limit;
    }

    const response = await axios.get(
      `https://lip-balance-analyze-extends.trycloudflare.com/api/search/jobseekers`,
      {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error searching job seekers:", error.message);
    throw error;
  }
};























