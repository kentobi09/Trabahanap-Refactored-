"use client";
import React, { useState, useEffect } from "react";
import { Search, Ban, ShieldAlert, CheckCircle2, UserCheck, RefreshCw, AlertCircle, Clock } from "lucide-react";
import axios from "axios";

interface User {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  userType: string;
  verificationStatus: string;
  accountStatus?: string;
  banReason?: string;
  suspendReason?: string;
  suspendedUntil?: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionModalType, setActionModalType] = useState<"ban" | "suspend" | null>(null);
  const [banReason, setBanReason] = useState<string>("Violation of terms of service");
  const [suspendReason, setSuspendReason] = useState<string>("Temporary suspension due to report");
  const [suspendDays, setSuspendDays] = useState<number>(7);
  const [processing, setProcessing] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Connect to Express/MongoDB backend to fetch native users
      const response = await axios.get("http://localhost:3000/api/users/all");
      setUsers(response.data || []);
    } catch (err) {
      console.warn("Failed to fetch users from Express server, attempting FastAPI admin backend...", err);
      try {
        const response = await axios.get("http://localhost:8000/get_all_applicants");
        setUsers(response.data || []);
      } catch (adminErr) {
        console.error("Error fetching users:", adminErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBanUser = async () => {
    if (!selectedUser) return;
    setProcessing(true);
    const userId = selectedUser.id || selectedUser._id;
    try {
      await axios.put(
        `http://localhost:8000/api/users/${userId}/ban?reason=${encodeURIComponent(banReason)}`
      );
      setFeedbackMessage({ type: "success", text: `Successfully banned user ${selectedUser.emailAddress}` });
      setActionModalType(null);
      fetchUsers();
    } catch (err: any) {
      setFeedbackMessage({ type: "error", text: err.response?.data?.detail || "Failed to ban user." });
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;
    setProcessing(true);
    const userId = selectedUser.id || selectedUser._id;
    try {
      await axios.put(
        `http://localhost:8000/api/users/${userId}/suspend?days=${suspendDays}&reason=${encodeURIComponent(suspendReason)}`
      );
      setFeedbackMessage({ type: "success", text: `Successfully suspended ${selectedUser.emailAddress} for ${suspendDays} days` });
      setActionModalType(null);
      fetchUsers();
    } catch (err: any) {
      setFeedbackMessage({ type: "error", text: err.response?.data?.detail || "Failed to suspend user." });
    } finally {
      setProcessing(false);
    }
  };

  const handleUnbanUser = async (user: User) => {
    const userId = user.id || user._id;
    if (!confirm(`Are you sure you want to reactivate user ${user.emailAddress}?`)) return;
    setProcessing(true);
    try {
      await axios.put(`http://localhost:8000/api/users/${userId}/unban`);
      setFeedbackMessage({ type: "success", text: `Reactivated account for ${user.emailAddress}` });
      fetchUsers();
    } catch (err: any) {
      setFeedbackMessage({ type: "error", text: err.response?.data?.detail || "Failed to activate user." });
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
    const email = (user.emailAddress || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = fullName.includes(query) || email.includes(query);

    const status = user.accountStatus || "active";
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">User Account Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage user account statuses: Active, Suspended, or Banned</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Users</span>
        </button>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between ${
            feedbackMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-xs underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B153C]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          {["all", "active", "suspended", "banned"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                statusFilter === status
                  ? "bg-[#0B153C] text-amber-400 shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">User Type</th>
                <th className="px-6 py-4">Account Status</th>
                <th className="px-6 py-4">Verification</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const status = user.accountStatus || "active";
                  return (
                    <tr key={user.id || user._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-xs text-slate-400">{user.emailAddress}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
                          {user.userType || "Job Seeker"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {status === "banned" && (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full">
                            <Ban className="w-3.5 h-3.5" />
                            <span>Banned</span>
                          </span>
                        )}
                        {status === "suspended" && (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Suspended</span>
                          </span>
                        )}
                        {status === "active" && (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`capitalize text-xs font-semibold ${
                            user.verificationStatus === "verified" ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {user.verificationStatus || "pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {status === "active" ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setActionModalType("suspend");
                              }}
                              className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 text-xs font-bold rounded-lg transition-all"
                            >
                              Suspend
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setActionModalType("ban");
                              }}
                              className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold rounded-lg transition-all"
                            >
                              Ban
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleUnbanUser(user)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold rounded-lg transition-all"
                          >
                            Unban / Activate
                          </button>
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

      {/* Ban User Modal */}
      {actionModalType === "ban" && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <ShieldAlert className="w-7 h-7" />
              <h3 className="text-lg font-bold text-slate-900">Ban Account</h3>
            </div>
            <p className="text-sm text-slate-600">
              You are about to permanently ban <span className="font-bold text-slate-900">{selectedUser.emailAddress}</span>.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reason for Ban</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setActionModalType(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBanUser}
                disabled={processing}
                className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-sm hover:bg-rose-700 shadow-md"
              >
                {processing ? "Banning..." : "Confirm Ban"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend User Modal */}
      {actionModalType === "suspend" && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <Clock className="w-7 h-7" />
              <h3 className="text-lg font-bold text-slate-900">Suspend Account</h3>
            </div>
            <p className="text-sm text-slate-600">
              Temporarily restrict access for <span className="font-bold text-slate-900">{selectedUser.emailAddress}</span>.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Duration (Days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={suspendDays}
                onChange={(e) => setSuspendDays(parseInt(e.target.value) || 7)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reason for Suspension</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setActionModalType(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendUser}
                disabled={processing}
                className="px-4 py-2 bg-amber-600 text-white font-bold rounded-xl text-sm hover:bg-amber-700 shadow-md"
              >
                {processing ? "Suspending..." : "Confirm Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
