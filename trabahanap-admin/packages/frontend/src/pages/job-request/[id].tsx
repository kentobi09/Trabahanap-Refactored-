import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout/MainLayout";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Briefcase,
  UserCircle,
  Users,
  Image as ImageIcon,
} from "lucide-react";
import {
  Job,
  JobStatusEnum,
  getJobRequestById,
} from "../../services/job_transaction";

// Helper function to format category strings
const formatCategory = (category: string) => {
  if (!category) return '';
  const result = category.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

const JobRequestDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [jobRequestData, setJobRequestData] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Job ID is missing.");
      setIsLoading(false);
      return;
    }
    const fetchJobRequestDetails = async () => {
      try {
        setIsLoading(true);
        const data = await getJobRequestById(id);
        setJobRequestData(data);
        setError(null);
      } catch (err) {
        setError(
          "Failed to fetch job request details. Please try again later."
        );
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobRequestDetails();
  }, [id]);

  const getStatusColor = (status: JobStatusEnum) => {
    switch (status) {
      case JobStatusEnum.OPEN:
        return "bg-blue-100 text-blue-800";
      case JobStatusEnum.PENDING:
        return "bg-yellow-100 text-yellow-800";
      case JobStatusEnum.COMPLETED:
        return "bg-green-100 text-green-800";
      case JobStatusEnum.REVIEWED:
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          Loading job details...
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center text-red-500">
          {error}
        </div>
      </MainLayout>
    );
  }

  if (!jobRequestData) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          Job request not found.
        </div>
      </MainLayout>
    );
  }

  // Determine the base URL for assets. Assumes VITE_API_URL is the root of the backend server (e.g., http://localhost:8000)
  const ASSET_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:3000";

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/job-request")}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job Requests
          </Button>
          <h1
            className="text-3xl font-bold truncate"
            title={jobRequestData.jobTitle}
          >
            {jobRequestData.jobTitle}
          </h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Left Column - Job Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Job Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
                Job Information
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Description
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {jobRequestData.jobDescription}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Category
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {formatCategory(jobRequestData.category)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Status
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(
                        jobRequestData.jobStatus
                      )}`}
                    >
                      {jobRequestData.jobStatus}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Budget
                    </h3>
                    <p className="text-gray-700 flex items-center">
                      <span className="mr-1 text-green-600 font-semibold">
                        ₱
                      </span>{" "}
                      {jobRequestData.budget}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Duration
                    </h3>
                    <p className="text-gray-700 flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-gray-600" />{" "}
                      {jobRequestData.jobDuration}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Location
                  </h3>
                  <p className="text-gray-700 flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-red-600" />{" "}
                    {jobRequestData.jobLocation}
                  </p>
                </div>
              </div>
            </div>

            {/* Job Images */}
            {jobRequestData.jobImage && jobRequestData.jobImage.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Job Images
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {jobRequestData.jobImage.map((imagePath, index) => {
                    // Ensure no double slashes if imagePath somehow starts with one, or if ASSET_BASE_URL ends with one.
                    const fullImageUrl = `${ASSET_BASE_URL.replace(
                      /\/+$/,
                      ""
                    )}/${imagePath.replace(/^\/+/, "")}`;
                    return (
                      <a
                        key={index}
                        href={fullImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={fullImageUrl}
                          alt={`Job image ${index + 1}`}
                          className="rounded-md object-cover aspect-square w-full h-full"
                        />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Client, Dates, etc. */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <UserCircle className="h-5 w-5 mr-2 text-blue-600" />
                Client Information
              </h2>
              {/* Display Client ID. In a real app, fetch client details. */}
              <p className="text-gray-700">
                Client ID: {jobRequestData.clientId}
              </p>
              {jobRequestData.jobSeekerId && (
                <>
                  <h2 className="text-xl font-semibold mt-4 mb-2 flex items-center">
                    <UserCircle className="h-5 w-5 mr-2 text-green-600" />
                    Assigned Job Seeker
                  </h2>
                  <p className="text-gray-700">
                    Job Seeker ID: {jobRequestData.jobSeekerId}
                  </p>
                </>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                Dates & Counts
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Date Posted:
                  </span>
                  <span className="text-gray-700">
                    {new Date(jobRequestData.datePosted).toLocaleDateString()}
                  </span>
                </div>
                {jobRequestData.acceptedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      Date Accepted:
                    </span>
                    <span className="text-gray-700">
                      {new Date(jobRequestData.acceptedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {jobRequestData.completedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      Date Completed:
                    </span>
                    <span className="text-gray-700">
                      {new Date(
                        jobRequestData.completedAt
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {jobRequestData.verifiedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      Date Verified:
                    </span>
                    <span className="text-gray-700">
                      {new Date(jobRequestData.verifiedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t mt-2">
                  <span className="text-sm font-medium text-gray-500">
                    Applicant Count:
                  </span>
                  <span className="text-gray-700 flex items-center">
                    <Users className="h-4 w-4 mr-1 text-gray-600" />
                    {jobRequestData.applicantCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Optional fields like rating and review could be added here if present */}
            {(jobRequestData.jobRating || jobRequestData.jobReview) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">Feedback</h2>
                {jobRequestData.jobRating && (
                  <p>Rating: {jobRequestData.jobRating}/5</p>
                )}
                {jobRequestData.jobReview && (
                  <p>Review: {jobRequestData.jobReview}</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default JobRequestDetailsPage;
