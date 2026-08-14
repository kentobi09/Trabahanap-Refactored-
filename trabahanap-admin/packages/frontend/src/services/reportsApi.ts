import axiosInstance from "./axiosInstance";

// This interface should match the ReportValidation model from the backend
export interface Report {
  id: string; // PydanticObjectId is a string on the frontend
  reportedObjectId: string; // Corrected field name to match backend model alias
  reporter: string;
  reason: string;
  status: string;
  dateReported: string; // Corrected field name to match backend model alias
  dateApproved?: string; // Added optional field for approval date
  reporterName?: string; // Added for user-friendly display, matches backend alias
  reportedObjectName?: string; // Added for user-friendly display, matches backend alias
}

/**
 * Fetches all pending reports.
 */
export const getPendingReports = async (): Promise<Report[]> => {
  try {
    // Paths are now relative to the baseURL in axiosInstance (e.g., /api/reports/pending)
    const response = await axiosInstance.get<Report[]>(`/api/reports/pending`);
    return response.data;
  } catch (error) {
    console.error("Error fetching pending reports:", error);
    throw error;
  }
};

/**
 * Fetches all reports (pending, approved, rejected).
 */
export const getAllReports = async (): Promise<Report[]> => {
  try {
    const response = await axiosInstance.get<Report[]>(`/api/reports/all`);
    return response.data;
  } catch (error) {
    console.error("Error fetching all reports:", error);
    throw error;
  }
};

/**
 * Approves a report.
 * @param reportId The ID of the report to approve.
 */
export const approveReport = async (reportId: string): Promise<Report> => {
  try {
    const response = await axiosInstance.put<Report>(
      `/api/reports/${reportId}/approve`
    );
    return response.data;
  } catch (error) {
    console.error(`Error approving report ${reportId}:`, error);
    throw error;
  }
};

/**
 * Rejects a report.
 * @param reportId The ID of the report to reject.
 */
export const rejectReport = async (reportId: string): Promise<Report> => {
  try {
    const response = await axiosInstance.put<Report>(
      `/api/reports/${reportId}/reject`
    );
    return response.data;
  } catch (error) {
    console.error(`Error rejecting report ${reportId}:`, error);
    throw error;
  }
};
