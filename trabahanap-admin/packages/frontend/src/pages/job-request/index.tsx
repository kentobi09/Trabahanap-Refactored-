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
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Job, JobStatusEnum, getAllJobRequests } from '../../services/job_transaction';

// Helper function to format category strings
const formatCategory = (category: string) => {
  if (!category) return '';
  const result = category.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
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
        setJobRequests(data);
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

  const handleExportCSV = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/job_requests/export/csv", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `job_requests_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting CSV:", err);
      alert("Failed to export CSV. Please try again.");
    }
  };

  if (isLoading) {
    return <MainLayout><div className="container mx-auto px-4 py-8 text-center">Loading job requests...</div></MainLayout>;
  }

  if (error) {
    return <MainLayout><div className="container mx-auto px-4 py-8 text-center text-red-500">{error}</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Job Requests</h1>
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition-colors text-sm"
          >
            <span>Export CSV</span>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title</TableHead>
                <TableHead>Client ID</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Posted</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No job requests found.</TableCell>
                </TableRow>
              ) : (
                jobRequests.map((request) => (
                  <TableRow key={request._id}>
                    <TableCell>
                      <p className="font-medium">{request.jobTitle}</p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">{request.jobDescription}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{request.clientId}</p>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {formatCategory(request.category)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.jobStatus)}`}>
                        {request.jobStatus}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(request.datePosted).toLocaleDateString()}</TableCell>
                    <TableCell>{request.applicantCount}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleViewDetails(request._id)}
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
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default JobRequestPage;