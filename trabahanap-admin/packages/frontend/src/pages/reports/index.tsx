import React, { useState, useEffect } from "react";
import {
  Search,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  CheckCircle2, // For status icons
  ListFilter, // For filter dropdown icon
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { MainLayout } from "../../components/layout/MainLayout";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import {
  getAllReports,
  approveReport,
  rejectReport,
  Report,
} from "../../services/reportsApi";

const ReportsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // Default to all
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const allReports = await getAllReports(); // Fetch all reports
        setReports(allReports);
      } catch (err) {
        setError(
          "Failed to fetch reports. Please ensure the backend is running and reachable."
        );
        console.error(err);
        setReports([]); // Clear reports on error
      }
      setIsLoading(false);
    };
    fetchReports();
  }, []); // Empty dependency array: fetch only on mount

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      // Removed 'under review' and 'resolved' as they are not standard backend statuses
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredReports = reports.filter((report) => {
    const reportValuesForSearch = [
      report.id,
      report.reporter, // Keep original ID for search
      report.reporterName || "", // Add name for search
      report.reportedObjectId, // Keep original ID for search
      report.reportedObjectName || "", // Add name for search
      report.reason,
      report.status,
      report.dateReported,
      report.dateApproved || "", // Include dateApproved in search if it exists
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      searchTerm === "" ||
      reportValuesForSearch.includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || // 'all' may not be used if only pending are fetched initially
      report.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setShowViewModal(true);
  };

  const handleAcceptReport = (report: Report) => {
    setSelectedReport(report);
    setShowAcceptModal(true);
  };

  const handleRejectReport = (report: Report) => {
    setSelectedReport(report);
    setShowRejectModal(true);
  };

  const handleConfirmAccept = async (action: "none" | "suspend" | "ban" = "none") => {
    if (!selectedReport) return;
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/reports/${selectedReport.id}/approve?action=${action}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      });
      if (!response.ok) throw new Error("Approval failed");
      const approvedReportData = await response.json();
      setReports((prevReports) =>
        prevReports.map((r) =>
          r.id === selectedReport.id
            ? {
                ...r,
                status: "approved",
                dateApproved: approvedReportData.date_approved || approvedReportData.dateApproved,
              }
            : r
        )
      );
      setShowAcceptModal(false);
      setSelectedReport(null);
    } catch (err) {
      setError("Failed to approve report.");
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleConfirmReject = async () => {
    if (!selectedReport) return;
    setIsLoading(true);
    try {
      await rejectReport(selectedReport.id);
      // Update the report in the local list
      setReports((prevReports) =>
        prevReports.map((r) =>
          r.id === selectedReport.id ? { ...r, status: "rejected" } : r
        )
      );
      setShowRejectModal(false);
      setSelectedReport(null);
    } catch (err) {
      setError("Failed to reject report.");
      console.error(err);
    }
    setIsLoading(false);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">User Reports Management</h1>

        {error && (
          <div
            className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Filters and Search */}
        <div className="mb-6 flex items-center space-x-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search reports... (ID, reason, etc.)"
              className="pl-10 w-full bg-white border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px] bg-white border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
              <ListFilter className="w-4 h-4 mr-2 text-gray-500" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="all"
                className="hover:bg-gray-50 cursor-pointer bg-white"
              >
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  All Statuses
                </span>
              </SelectItem>
              <SelectItem
                value="pending"
                className="hover:bg-gray-50 cursor-pointer bg-white"
              >
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  Pending
                </span>
              </SelectItem>
              <SelectItem
                value="approved"
                className="hover:bg-gray-50 cursor-pointer bg-white"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Approved
                </span>
              </SelectItem>
              <SelectItem
                value="rejected"
                className="hover:bg-gray-50 cursor-pointer bg-white"
              >
                <span className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Rejected
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <p className="ml-4 text-gray-700">Loading reports...</p>
          </div>
        )}

        {/* No Reports Message (handles empty after load, or error) */}
        {!isLoading && !error && filteredReports.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No reports found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filter."
                : "There are no reports currently."}
            </p>
          </div>
        )}

        {/* Reports Table - Render only if not loading, no error, and reports exist */}
        {!isLoading && !error && filteredReports.length > 0 && (
          <div className="overflow-x-auto shadow-md rounded-lg">
            <Table className="min-w-full divide-y divide-gray-200">
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                    Report ID
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px]">
                    Reporter
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px]">
                    Reported
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                    Reason
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                    Status
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Date Reported
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-gray-50">
                    <TableCell
                      className="px-6 py-4 text-sm text-gray-900"
                      title={report.id}
                    >
                      <div className="truncate max-w-[100px]">{report.id}</div>
                    </TableCell>
                    <TableCell
                      className="px-6 py-4 text-sm text-gray-900"
                      title={report.reporterName || report.reporter}
                    >
                      <div className="truncate max-w-[150px]">{report.reporterName || report.reporter}</div>
                    </TableCell>
                    <TableCell
                      className="px-6 py-4 text-sm text-gray-900"
                      title={report.reportedObjectName || report.reportedObjectId}
                    >
                      <div className="truncate max-w-[150px]">{report.reportedObjectName || report.reportedObjectId}</div>
                    </TableCell>
                    <TableCell
                      className="px-6 py-4 text-sm text-gray-900"
                      title={report.reason}
                    >
                      <div className="truncate max-w-[200px]">{report.reason}</div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          report.status
                        )}`}
                      >
                        {report.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(report.dateReported).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-3">
                        <button
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          title="View Report"
                          onClick={() => handleViewReport(report)}
                          disabled={isLoading}
                        >
                          <Eye size={24} className="text-blue-600" />
                        </button>
                        {report.status === "pending" && (
                          <>
                            <button
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                              title="Approve Report"
                              onClick={() => handleAcceptReport(report)}
                              disabled={isLoading}
                            >
                              <CheckCircle
                                size={24}
                                className="text-green-600"
                              />
                            </button>
                            <button
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                              title="Reject Report"
                              onClick={() => handleRejectReport(report)}
                              disabled={isLoading}
                            >
                              <XCircle size={24} className="text-red-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Modals */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="bg-white border-none shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Report Details
              </DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="py-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Report ID
                  </h3>
                  <p className="text-base text-gray-900 mt-1">
                    {selectedReport.id}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Reporter
                  </h3>
                  <p className="text-base text-gray-900 mt-1">
                    {selectedReport.reporterName || selectedReport.reporter}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Reported Object
                  </h3>
                  <p className="text-base text-gray-900 mt-1">
                    {selectedReport.reportedObjectName ||
                      selectedReport.reportedObjectId}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Reason</h3>
                  <p className="text-base text-gray-900 mt-1 break-all">
                    {selectedReport.reason}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Date Reported
                  </h3>
                  <p className="text-base text-gray-900 mt-1">
                    {new Date(selectedReport.dateReported).toLocaleString()}
                  </p>
                </div>
                {selectedReport.status === "approved" &&
                  selectedReport.dateApproved && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Date Approved
                      </h3>
                      <p className="text-base text-gray-900 mt-1">
                        {new Date(selectedReport.dateApproved).toLocaleString()}
                      </p>
                    </div>
                  )}
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <span
                    className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${getStatusColor(
                      selectedReport.status
                    )}`}
                  >
                    {selectedReport.status}
                  </span>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Accept Report Modal */}
        <Dialog open={showAcceptModal} onOpenChange={setShowAcceptModal}>
          <DialogContent className="bg-white border-none shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Approve Report
              </DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="py-4 space-y-4">
                <p className="text-gray-600">
                  Are you sure you want to approve this report? This action will
                  mark the report as approved and create a final record.
                </p>
                <div className="space-y-2 p-2 border rounded-md bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-700">
                    Report Details:
                  </h3>
                  <p className="text-sm text-gray-900">
                    <strong>ID:</strong> {selectedReport.id}
                  </p>
                  <p className="text-sm text-gray-900">
                    <strong>Reporter:</strong>{" "}
                    {selectedReport.reporterName || selectedReport.reporter}
                  </p>
                  <p className="text-sm text-gray-900">
                    <strong>Reported Object:</strong>{" "}
                    {selectedReport.reportedObjectName ||
                      selectedReport.reportedObjectId}
                  </p>
                  <p className="text-sm text-gray-900">
                    <strong>Reason:</strong> {selectedReport.reason}
                  </p>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-2 w-full justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowAcceptModal(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleConfirmAccept("none")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    disabled={isLoading}
                  >
                    Approve Only
                  </Button>
                  <Button
                    onClick={() => handleConfirmAccept("suspend")}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                    disabled={isLoading}
                  >
                    Approve & Suspend
                  </Button>
                  <Button
                    onClick={() => handleConfirmAccept("ban")}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                    disabled={isLoading}
                  >
                    Approve & Ban
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Report Modal */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent className="bg-white border-none shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Reject Report
              </DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="py-4 space-y-4">
                <p className="text-gray-600">
                  Are you sure you want to reject this report? This action will
                  mark the report as rejected. No further action will be taken
                  against the reported user/content based on this report.
                </p>
                <div className="space-y-2 p-2 border rounded-md bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-700">
                    Report Details:
                  </h3>
                  <p className="text-sm text-gray-900">
                    <strong>ID:</strong> {selectedReport.id}
                  </p>
                  <p className="text-sm text-gray-900">
                    <strong>Reporter:</strong>{" "}
                    {selectedReport.reporterName || selectedReport.reporter}
                  </p>
                  <p className="text-sm text-gray-900">
                    <strong>Reported Object:</strong>{" "}
                    {selectedReport.reportedObjectName ||
                      selectedReport.reportedObjectId}
                  </p>
                  <p className="text-sm text-gray-900">
                    <strong>Reason:</strong> {selectedReport.reason}
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectModal(false)}
                    className="mr-2"
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmReject}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? "Rejecting..." : "Reject Report"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default ReportsPage;
