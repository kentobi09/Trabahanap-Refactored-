import axios from "axios";

let formData = new FormData();

export function SignUpData(params) {
  if (!params) return;

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
      const value =
        typeof params[key] === "string" ? params[key].trim() : params[key];
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });
  }
}

export const handleFormData = async () => {
  try {
    const host = process.env.EXPO_PUBLIC_IP_ADDRESS || 'localhost';
    const response = await axios.post(
      `http://${host}:3000/signup`,
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
      `http://${host}:3000/store-otp`,
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
      `http://${host}:3000/verify-otp`,
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
      `http://${host}:3000/verify-applicant`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    return response.data;
  } catch (error) {


    return error.response?.data?.error || "Failed to create applicant";
  }
};
