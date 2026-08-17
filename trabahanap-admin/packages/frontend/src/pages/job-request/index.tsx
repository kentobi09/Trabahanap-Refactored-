import { useState, useEffect } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Job, JobStatusEnum, getAllJobRequests } from '../../services/job_transaction';

// Helper function to format category strings
const formatCategory = (category?: string) => {
  if (!category) return 'Other';
  const result = String(category).replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

// Helper function to format rate display (e.g. ₱90/hr, ₱1000/day)
const formatBudgetDisplay = (budget?: number, duration?: string) => {
  if (budget === undefined || budget === null) return '₱0';
  const durStr = String(duration || '').trim().toLowerCase();
  
  if (durStr.includes('hour') || durStr.includes('hr')) {
    return `₱${budget.toLocaleString()}/hr`;
  }
  if (durStr.includes('day')) {
    return `₱${budget.toLocaleString()}/day`;
  }
  if (durStr.includes('week') || durStr.includes('wk')) {
    return `₱${budget.toLocaleString()}/wk`;
  }
  if (durStr.includes('month') || durStr.includes('mo')) {
    return `₱${budget.toLocaleString()}/mo`;
  }
  return `₱${budget.toLocaleString()}`;
};

const JobRequestPage = () => {
  const navigate = useNavigate();
  const [jobRequests, setJobRequests] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobRequests = async () => {
      try {
        setIsLoading(true);
        const data = await getAllJobRequests();
        setJobRequests(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        setError('Failed to fetch job requests. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobRequests();
  }, []);

  const handleViewDetails = (id: string) => {
    navigate(`/job-request/${id}`);
  };

  const getStatusColor = (status: JobStatusEnum) => {
    switch (status) {
      case JobStatusEnum.OPEN:
        return 'bg-blue-100 text-blue-800';
      case JobStatusEnum.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case JobStatusEnum.COMPLETED:
        return 'bg-green-100 text-green-800';
      case JobStatusEnum.REVIEWED:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const handleExportCSV = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (categoryFilter !== "all") queryParams.append("category", categoryFilter);
      if (statusFilter !== "all") queryParams.append("status", statusFilter);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

      let response = await fetch(`http://localhost:8000/admin/api/job_requests/export/csv${queryString}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      });

      if (!response.ok) {
        response = await fetch(`http://localhost:8000/api/job_requests/export/csv${queryString}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
          },
        });
      }

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `peso_job_requests_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting CSV:", err);
      alert("Failed to export CSV. Please try again.");
    }
  };

  const filteredRequests = jobRequests.filter((request) => {
    const matchesCategory = categoryFilter === "all" || (request.category || "").toLowerCase() === categoryFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || (request.jobStatus || "").toLowerCase() === statusFilter.toLowerCase();
    const matchesQuery = !searchQuery || 
      (request.jobTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
      (request.jobLocation || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesQuery;
  });

  if (isLoading) {
    return <MainLayout><div className="container mx-auto px-4 py-8 text-center font-medium text-gray-600">Loading job requests...</div></MainLayout>;
  }

  if (error) {
    return <MainLayout><div className="container mx-auto px-4 py-8 text-center text-red-500 font-medium">{error}</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Job Requests (PESO Tuguegarao)</h1>
            <p className="text-sm text-gray-500 mt-1">Filter, search, and export job request records for official reporting</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-lg shadow-sm transition-colors text-sm w-fit"
          >
            <span>Export Filtered CSV</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Search Title / Location</label>
            <input
              type="text"
              placeholder="Filter by title or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Filter Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="plumbing">Plumbing</option>
              <option value="carpentry">Carpentry</option>
              <option value="electrical">Electrical</option>
              <option value="cleaning">Cleaning</option>
              <option value="gardening">Gardening</option>
              <option value="driving">Driving</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Filter Job Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title & Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location / Address</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Posted</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-gray-500">No job requests found.</TableCell>
                </TableRow>
              ) : (
                filteredRequests
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((request) => (
                  <TableRow key={request._id || request.id}>
                    <TableCell>
                      <p className="font-semibold text-gray-900">{request.jobTitle || 'Untitled Job'}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">{request.jobDescription || ''}</p>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {formatCategory(request.category)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-700 max-w-xs truncate" title={request.jobLocation}>
                      {request.jobLocation || 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-emerald-700">
                      {formatBudgetDisplay(request.budget, request.jobDuration)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.jobStatus)}`}>
                        {request.jobStatus || 'open'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {request.datePosted ? new Date(request.datePosted).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-gray-700">{request.applicantCount || 0}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => handleViewDetails(request._id || request.id)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5 text-blue-600" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          {filteredRequests.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 gap-4">
              <div className="text-sm text-gray-700">
                Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredRequests.length)}</span> of{" "}
                <span className="font-semibold">{filteredRequests.length}</span> job requests
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="bg-white border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                >
                  Previous
                </Button>
                <span className="text-sm font-medium text-gray-700 px-2">
                  Page {currentPage} of {Math.ceil(filteredRequests.length / itemsPerPage) || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(filteredRequests.length / itemsPerPage)))}
                  disabled={currentPage >= Math.ceil(filteredRequests.length / itemsPerPage)}
                  className="bg-white border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default JobRequestPage;