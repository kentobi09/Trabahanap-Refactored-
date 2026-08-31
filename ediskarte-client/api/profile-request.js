import axios from "axios";
import decodeToken from "./token-decoder";
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function fetchUserProfile() {
  const { data } = await decodeToken();
  const token = await AsyncStorage.getItem("token");

  if (!token) {
    console.error("No token found in AsyncStorage for fetchUserProfile");
    throw new Error("Authentication token not found.");
  }

  const response = await axios.get(
    `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/user/profile/${data.id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        userType: data.userType,
      },
    }
  );

  return response.data;
}

export async function updateUserProfile(data) {
  const token = await AsyncStorage.getItem("token");

  if (!token) {
    console.error("No token found in AsyncStorage for updateUserProfile");
    throw new Error("Authentication token not found.");
  }

  const isFormData = data instanceof FormData;
  const headers = {
    Authorization: `Bearer ${token}`,
  };
  if (isFormData) {
    headers["Content-Type"] = "multipart/form-data";
  }

  const userId = isFormData ? data.get("id") : data.id;

  if (!userId) {
    console.error("User ID is missing in the data for updateUserProfile");
    throw new Error("User ID is required to update profile.");
  }

  const response = await axios.patch(
    `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/user/profile/edit/${userId}`,
    data,
    {
      headers: headers,
    }
  );
  return response.data;
}

export async function updateUserJobTags(data) {
  const token = await AsyncStorage.getItem("token");

  if (!token) {
    console.error("No token found in AsyncStorage for updateUserJobTags");
    throw new Error("Authentication token not found.");
  }

  const response = await axios.patch(
    `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/user/profile/edit/job-tags/${data.id}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
}

export async function fetchUserAchievements(userId) {
  const token = await AsyncStorage.getItem("token");

  if (!token) {
    console.error("No token found in AsyncStorage for fetchUserAchievements");
    throw new Error("Authentication token not found.");
  }

  if (!userId) {
    const { data } = await decodeToken();
    userId = data.id;
  }

  try {
    const response = await axios.get(
      `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/user/achievements/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching user achievements:", error);
    throw error;
  }
}

export async function uploadCredential(
  userId,
  credentialImages,
  existingCredentials = []
) {
  const token = await AsyncStorage.getItem("token");

  if (!token) {
    // Silent failure without console errors
    throw new Error("Authentication token not found.");
  }

  // Ensure credentialImages is always an array (handling both single image and array of images)
  const images = Array.isArray(credentialImages)
    ? credentialImages
    : [credentialImages];

  // Validate images - ensure we have valid image objects
  if (images.length === 0 || !images.every((img) => img && img.uri)) {
    throw new Error("No valid images provided for upload");
  }

  // Prepare all image objects at once for better performance
  const imageFiles = images.map((image, index) => ({
    uri: image.uri,
    type: image.mimeType || image.type || "image/jpeg", // Default to jpeg if no type is provided
    name:
      image.fileName || image.uri.split("/").pop() || `credential_${index}.jpg`,
  }));

  // Create FormData with all images
  const createFormData = () => {
    const formData = new FormData();

    // Add all prepared image objects to formData
    imageFiles.forEach((fileInfo) => {
      formData.append("credentialFile", fileInfo);
    });

    // Add existing credentials as a single JSON string
    if (existingCredentials && existingCredentials.length > 0) {
      formData.append(
        "existingCredentials",
        JSON.stringify(existingCredentials)
      );
    }

    // Add userId to formData for extra safety
    formData.append("userId", userId);

    return formData;
  };

  // Setup for the upload request
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "multipart/form-data",
    Accept: "application/json",
  };

  const url = `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/user/profile/upload-credential/${userId}`;
  // No need to log the URL to keep console clean

  // Function to attempt the upload with exponential backoff (up to 5 retries)
  const attemptUpload = async (retryCount = 0, delay = 300) => {
    try {
      // Create a fresh FormData object for each attempt
      const formData = createFormData();

      console.log(`----- UPLOAD ATTEMPT ${retryCount + 1} -----`);
      console.log(`UserId: ${userId}`);
      console.log(`Number of images: ${images.length}`);
      console.log(
        `Number of existing credentials: ${existingCredentials.length}`
      );
      console.log(
        `FormData fields:`,
        Object.fromEntries(formData._parts || [])
      );

      // Add a small delay before the first attempt to ensure FormData is ready
      if (retryCount === 0) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const response = await axios.post(url, formData, { headers });

      // Log successful response
      console.log(`----- UPLOAD SUCCESS -----`);
      console.log(`Response status: ${response.status}`);
      console.log(`Response data:`, JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error) {
      // Log detailed error information to help diagnose issues
      console.log(`----- UPLOAD ATTEMPT ${retryCount + 1} FAILED -----`);

      if (error.response) {
        // The server responded with a status code outside the 2xx range
        console.log(`Response status: ${error.response.status}`);
        console.log(`Response headers:`, error.response.headers);
        console.log(`Response data:`, error.response.data);
      } else if (error.request) {
        // The request was made but no response was received
        console.log(`No response received:`, error.request);
      } else {
        // Something happened in setting up the request
        console.log(`Request setup error:`, error.message);
      }

      // Retry logic - max 5 retries with exponential backoff
      if (retryCount < 5) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return attemptUpload(retryCount + 1, delay * 2);
      }

      // Log final failure after all retries
      console.log(`----- UPLOAD FAILED AFTER ${retryCount + 1} ATTEMPTS -----`);

      // If we've exhausted all retries, throw the error
      throw error;
    }
  };

  // Start the upload process with retry logic
  return attemptUpload();
}

export async function deleteCredential(userId, credentialPath) {
  const token = await AsyncStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication token not found.");
  }

  const response = await axios.delete(
    `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/user/profile/credential/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        credentialPath,
      },
    }
  );

  return response.data;
}

export async function fetchPublicJobTags() {
  const ip = process.env.EXPO_PUBLIC_IP_ADDRESS || "localhost";
  const candidateUrls = Array.from(new Set([
    `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/user/job-tags`,
    `http://localhost:3000/user/job-tags`,
    `http://10.0.2.2:3000/user/job-tags`,
    `http://${ip}:8000/admin/api/public/job_tags`,
    `http://localhost:8000/admin/api/public/job_tags`,
    `http://10.0.2.2:8000/admin/api/public/job_tags`,
  ]));

  const fetchUrl = (url) =>
    new Promise((resolve, reject) => {
      axios.get(url, { timeout: 2000 })
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            resolve(res.data);
          } else {
            reject(new Error("Empty response"));
          }
        })
        .catch(reject);
    });

  try {
    const data = await Promise.any(candidateUrls.map(fetchUrl));
    if (data && Array.isArray(data) && data.length > 0) {
      await AsyncStorage.setItem("cached_job_tags_list", JSON.stringify(data)).catch(() => {});
      return data;
    }
  } catch (e) {
    // ignore parallel errors, move to cache fallback
  }

  try {
    const cached = await AsyncStorage.getItem("cached_job_tags_list");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  return [
    { tagId: "plumbing", label: "Plumbing", category: "Home Repairs & Construction" },
    { tagId: "electricalRepairs", label: "Electrical Repairs", category: "Home Repairs & Construction" },
    { tagId: "carpentry", label: "Carpentry", category: "Home Repairs & Construction" },
    { tagId: "roofRepair", label: "Roof Repair", category: "Home Repairs & Construction" },
    { tagId: "paintingServices", label: "Painting Services", category: "Home Repairs & Construction" },
    { tagId: "autoMechanic", label: "Auto Mechanic", category: "Automotive Services" },
    { tagId: "carWash", label: "Car Wash", category: "Automotive Services" },
    { tagId: "caregiver", label: "Caregiver", category: "Personal & Care Services" },
    { tagId: "personalDriver", label: "Personal Driver", category: "Personal & Care Services" },
    { tagId: "homeCleaningServices", label: "Home Cleaning", category: "Cleaning & Maintenance" },
    { tagId: "bagger", label: "Bagger", category: "Retail & Customer Service" },
    { tagId: "Promodicer", label: "Promodicer", category: "Retail & Customer Service" },
  ];
}


























