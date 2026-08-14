"use client";
import React, { useState, useEffect } from "react";
import { Download, RefreshCw, FileText, MapPin, Tag, Calendar } from "lucide-react";
import axios from "axios";

interface Job {
  id: string;
  _id?: string;
  jobTitle: string;
  category: string;
  jobLocation: string;
  budget: string;
  jobDuration: string;
  jobStatus: string;
  applicantCount: number;
  datePosted: string;
}

export default function JobRequestsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:8000/api/job_requests/");
      setJobs(response.data || []);
    } catch (err) {
      console.error("Error fetching job requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await axios.get("http://localhost:8000/api/job_requests/export/csv", {
        responseType: "blob",
      });

      // Create blob download link
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `job_requests_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting CSV:", err);
      alert("Failed to export CSV file.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Job Requests Management</h1>
          <p className="text-slate-500 text-sm mt-1">Review posted job offers and export records to CSV</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={fetchJobs}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? "Exporting..." : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Job Requests Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Job Title</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Budget</th>
                <th className="px-6 py-4">Applicants</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading job requests...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No job requests found.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id || job._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{job.jobTitle}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>{job.category}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{job.jobLocation}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-700">
                      ₱{job.budget}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {job.applicantCount || 0} applicants
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                        {job.jobStatus || "Open"}
                      </span>
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
