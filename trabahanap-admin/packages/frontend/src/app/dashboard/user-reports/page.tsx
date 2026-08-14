"use client";
import React, { useState, useEffect } from "react";
import { AlertTriangle, Ban, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import axios from "axios";

interface UserReport {
  id: string;
  reportedObjectId: string;
  reporter: string;
  reporterName?: string;
  reportedObjectName?: string;
  reason: string;
  status: string;
  dateReported: string;
}

export default function UserReportsPage() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:8000/api/reports/all");
      setReports(response.data || []);
    } catch (err) {
      console.error("Error fetching user reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleApproveReport = async (reportId: string, action: "ban" | "suspend" | "none") => {
    setProcessingId(reportId);
    try {
      await axios.put(`http://localhost:8000/api/reports/${reportId}/approve?action=${action}`);
      setMessage({
        type: "success",
        text: `Report approved successfully${action !== "none" ? ` and user ${action}ned` : ""}.`,
      });
      fetchReports();
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Failed to approve report." });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectReport = async (reportId: string) => {
    setProcessingId(reportId);
    try {
      await axios.put(`http://localhost:8000/api/reports/${reportId}/reject`);
      setMessage({ type: "success", text: "Report rejected." });
      fetchReports();
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Failed to reject report." });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">User Report Management</h1>
          <p className="text-slate-500 text-sm mt-1">Review flagged user behaviors and apply account sanctions</p>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Reports</span>
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

      {/* Reports Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Reported User</th>
                <th className="px-6 py-4">Reporter</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Loading reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No user reports pending.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {report.reportedObjectName || report.reportedObjectId}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {report.reporterName || report.reporter}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-slate-700 font-medium">
                      {report.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`capitalize px-3 py-1 rounded-full text-xs font-bold ${
                          report.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : report.status === "rejected"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {report.status === "pending" ? (
                        <>
                          <button
                            disabled={processingId === report.id}
                            onClick={() => handleApproveReport(report.id, "suspend")}
                            className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 text-xs font-bold rounded-lg transition-all inline-flex items-center space-x-1"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Approve & Suspend</span>
                          </button>
                          <button
                            disabled={processingId === report.id}
                            onClick={() => handleApproveReport(report.id, "ban")}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold rounded-lg transition-all inline-flex items-center space-x-1"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Approve & Ban</span>
                          </button>
                          <button
                            disabled={processingId === report.id}
                            onClick={() => handleRejectReport(report.id)}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 text-xs font-bold rounded-lg transition-all inline-flex items-center space-x-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
