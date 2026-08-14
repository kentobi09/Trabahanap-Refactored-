"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Eye, RefreshCw, FileText, User } from "lucide-react";
import axios from "axios";

interface Applicant {
  id: string;
  _id?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  email: string;
  user_type?: string;
  userType?: string;
  verification_status?: string;
  verificationStatus?: string;
  id_type?: string;
  idType?: string;
  id_validation_front_image?: string;
  idValidationFrontImage?: string;
  id_validation_back_image?: string;
  idValidationBackImage?: string;
}

export default function VerificationRequestsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchApplicants = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:8000/get_all_applicants");
      setApplicants(response.data || []);
    } catch (err) {
      console.error("Error fetching applicants:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  const handleUpdateStatus = async (applicantId: string, status: "verified" | "rejected") => {
    setProcessingId(applicantId);
    try {
      await axios.put(`http://localhost:8000/update_verification_status/${applicantId}?status=${status}`);
      setMessage({
        type: "success",
        text: `Applicant verification status updated to ${status}.`,
      });
      setSelectedApplicant(null);
      fetchApplicants();
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Failed to update verification status." });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">User Verification Requests</h1>
          <p className="text-slate-500 text-sm mt-1">Inspect ID documents and approve or reject user accounts</p>
        </div>
        <button
          onClick={fetchApplicants}
          className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between ${
            message.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Applicant</th>
                <th className="px-6 py-4">User Type</th>
                <th className="px-6 py-4">ID Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Loading verification requests...
                  </td>
                </tr>
              ) : applicants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No verification requests found.
                  </td>
                </tr>
              ) : (
                applicants.map((app) => {
                  const firstName = app.firstName || app.first_name || "";
                  const lastName = app.lastName || app.last_name || "";
                  const status = app.verificationStatus || app.verification_status || "pending";
                  const idType = app.idType || app.id_type || "N/A";
                  const userType = app.userType || app.user_type || "job-seeker";
                  const appId = app.id || app._id || "";

                  return (
                    <tr key={appId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">
                          {firstName} {lastName}
                        </div>
                        <div className="text-xs text-slate-400">{app.email}</div>
                      </td>
                      <td className="px-6 py-4 capitalize font-semibold text-slate-700">
                        {userType}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-600">
                        {idType}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`capitalize px-3 py-1 rounded-full text-xs font-bold ${
                            status === "verified"
                              ? "bg-emerald-100 text-emerald-800"
                              : status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedApplicant(app)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-lg transition-all inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View IDs</span>
                        </button>
                        {status === "pending" && (
                          <>
                            <button
                              disabled={processingId === appId}
                              onClick={() => handleUpdateStatus(appId, "verified")}
                              className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold rounded-lg transition-all shadow-sm inline-flex items-center space-x-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              disabled={processingId === appId}
                              onClick={() => handleUpdateStatus(appId, "rejected")}
                              className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold rounded-lg transition-all inline-flex items-center space-x-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ID Verification Details Modal (Fixed Overlay to Prevent Pitch Black Screen) */}
      {selectedApplicant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  ID Document Review - {selectedApplicant.firstName || selectedApplicant.first_name} {selectedApplicant.lastName || selectedApplicant.last_name}
                </h3>
                <p className="text-xs text-slate-500">{selectedApplicant.email}</p>
              </div>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase">ID Front Image</span>
                <div className="w-full h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                  {selectedApplicant.idValidationFrontImage || selectedApplicant.id_validation_front_image ? (
                    <img
                      src={selectedApplicant.idValidationFrontImage || selectedApplicant.id_validation_front_image}
                      alt="Front ID"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">No front image uploaded</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase">ID Back Image</span>
                <div className="w-full h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                  {selectedApplicant.idValidationBackImage || selectedApplicant.id_validation_back_image ? (
                    <img
                      src={selectedApplicant.idValidationBackImage || selectedApplicant.id_validation_back_image}
                      alt="Back ID"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">No back image uploaded</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setSelectedApplicant(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200"
              >
                Close
              </button>
              {(selectedApplicant.verificationStatus || selectedApplicant.verification_status || "pending") === "pending" && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedApplicant.id || selectedApplicant._id || "", "rejected")}
                    className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded-xl text-sm hover:bg-rose-100"
                  >
                    Reject Verification
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedApplicant.id || selectedApplicant._id || "", "verified")}
                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 shadow-md"
                  >
                    Approve Verification
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
