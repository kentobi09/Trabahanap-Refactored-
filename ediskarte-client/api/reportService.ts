import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000`;

interface ReportPayload {
  reporter: string; // ID of the user making the report
  reportedObjectId: string; // ID of the entity being reported
  reason?: string;
}

export const submitReport = async (
  reportingUserId: string,
  reportedObjectId: string,
  report: string
): Promise<any> => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      throw new Error("No token found");
    }

    const payload: ReportPayload = {
      reporter: reportingUserId,
      reportedObjectId: reportedObjectId,
      reason: report,
    };

    const response = await axios.post(`${API_URL}/api/report`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("Report response:", response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error submitting report:",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};
