import axios from "axios";

interface ApplicantData {
  _id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffixName?: string;
  age: number;
  gender: string;
  birthday: string;
  emailAddress: string;
  phoneNumber?: string;
  profileImage?: string;
  bio?: string;
  barangay: string;
  street: string;
  houseNumber?: string;
  userType: string;
  idValidationFrontImage?: string;
  idValidationBackImage?: string;
  idType?: string;
  jobsDone: number;
  joinedAt: string;
  verificationStatus: string;
  jobTags?: string[];
}

const baseUrl = "http://localhost:8000/admin";

export const getAllApplicants = async (): Promise<ApplicantData[]> => {
  try {
    const response = await axios.get(`${baseUrl}/get_all_applicants`);
    return response.data;
  } catch (error) {
    console.error("Error fetching applicants:", error);
    throw error;
  }
};

export const updateVerificationStatus = async (
  applicantId: string,
  status: string
): Promise<any> => {
  try {
    const response = await axios.put(
      `${baseUrl}/update_verification_status/${applicantId}?status=${status}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating applicant status to ${status}:`, error);
    throw error;
  }
};

export const getApplicantById = async (
  applicantId: string
): Promise<ApplicantData> => {
  try {
    const response = await axios.get(`${baseUrl}/get_applicant/${applicantId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching applicant with ID ${applicantId}:`, error);
    throw error;
  }
};
