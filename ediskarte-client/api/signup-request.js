import axios from "axios";

let formData = new FormData();

export function SignUpData(params) {
  if (!params) return;

  if (params.address && typeof params.address === "object") {
    if (params.address.barangay) formData.append("barangay", params.address.barangay);
    if (params.address.street) formData.append("street", params.address.street);
    if (params.address.houseNumber) formData.append("houseNumber", params.address.houseNumber);
    return;
  }

  if ("profileImage" in params && params.profileImage) {
    const fileName = params.profileImage.split("/").pop() || "profile.jpg";

    formData.append("profileImage", {
      uri: params.profileImage,
      name: fileName,
      type: "image/jpeg",
    });
  } else if ("frontImage" in params || "backImage" in params) {
    if (params.idType) {
      formData.append("idType", params.idType);
    }

    if (params.frontImage) {
      const frontFileName = params.frontImage.split("/").pop() || "front.jpg";
      formData.append("idValidationFrontImage", {
        uri: params.frontImage,
        name: frontFileName,
        type: "image/jpeg",
      });
    }

    if (params.backImage) {
      const backFileName = params.backImage.split("/").pop() || "back.jpg";
      formData.append("idValidationBackImage", {
        uri: params.backImage,
        name: backFileName,
        type: "image/jpeg",
      });
    }
  } else {
    Object.keys(params).forEach((key) => {
      const val = params[key];
      if (val !== undefined && val !== null) {
        if (typeof val === "object" && !Array.isArray(val) && !(val instanceof Blob) && !val.uri) {
          Object.keys(val).forEach((nestedKey) => {
            if (val[nestedKey] !== undefined && val[nestedKey] !== null) {
              formData.append(nestedKey, typeof val[nestedKey] === "string" ? val[nestedKey].trim() : val[nestedKey]);
            }
          });
        } else {
          const value = typeof val === "string" ? val.trim() : val;
          formData.append(key, value);
        }
      }
    });
  }
}

export const handleFormData = async () => {
  try {
    const host = process.env.EXPO_PUBLIC_IP_ADDRESS || 'localhost';
    const response = await axios.post(
      `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/signup`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    console.log("Successful upload!", response.data);
    return response.data;
  } catch (error) {
    console.error("Error Message", error.request);
  }
};

export const storeOTPRequest = async (email) => {
  try {
    const host = process.env.EXPO_PUBLIC_IP_ADDRESS || 'localhost';
    const response = await axios.post(
      `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/store-otp`,
      { email },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    console.log("OTP store request successful:", response.data);
    return response.data;
  } catch (error) {
    const errMsg = typeof error.response?.data === 'string' ? error.response.data : error.response?.data?.error || error.message;
    console.error("Error storing OTP:", errMsg);
    return false;
  }
};

export const verifyOTPRequest = async (email, otp) => {
  try {
    const host = process.env.EXPO_PUBLIC_IP_ADDRESS || 'localhost';
    const response = await axios.post(
      `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/verify-otp`,
      { email, otp },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    return response.data.success === true;
  } catch (error) {
    return false;
  }
};

export const getSignUpUserType = () => {
  return formData.get("userType");
};

export const clearFormData = () => {
  formData = new FormData();
};

export const verifyApplicant = async () => {
  try {
    const host = process.env.EXPO_PUBLIC_IP_ADDRESS || 'localhost';
    const response = await axios.post(
      `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/verify-applicant`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    return response.data;
  } catch (error) {
    const errMsg = error.response?.data?.error || error.response?.data?.details || error.message || "Failed to create applicant";
    return { success: false, error: errMsg };
  }
};














