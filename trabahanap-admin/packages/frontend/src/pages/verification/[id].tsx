import { useParams } from "react-router-dom";
import { MainLayout } from "../../components/layout/MainLayout";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Ban,
  Loader,
} from "lucide-react";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Badge } from "../../components/ui/badge";
import {
  getApplicantById,
  updateVerificationStatus,
} from "../../services/verification_api";

// Map API data structure to our component's needs
interface ApplicantDetails {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  age: number;
  gender: string;
  address: string;
  email: string;
  userType: string;
  verificationStatus: string;
  jobTags?: string[];
  profilePicture?: string;
  idFrontImage?: string;
  idBackImage?: string;
  idType?: string;
  phoneNumber?: string;
  joinedAt: string;
}

const VerificationProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "warning">(
    "success"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [confirmBan, setConfirmBan] = useState(false);
  const [applicant, setApplicant] = useState<ApplicantDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch applicant data from API
  useEffect(() => {
    const fetchApplicantData = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const data = await getApplicantById(id);

        // Map the API response to our interface structure
        const formattedApplicant: ApplicantDetails = {
          id: data._id,
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          suffix: data.suffixName,
          age: data.age,
          gender: data.gender,
          // Format address from parts
          address: [data.houseNumber, data.street, data.barangay]
            .filter(Boolean)
            .join(", "),
          email: data.emailAddress,
          userType: data.userType,
          verificationStatus: data.verificationStatus,
          jobTags: data.jobTags || [],
          profilePicture: data.profileImage,
          idFrontImage: data.idValidationFrontImage,
          idBackImage: data.idValidationBackImage,
          idType: data.idType,
          phoneNumber: data.phoneNumber,
          joinedAt: data.joinedAt,
        };

        setApplicant(formattedApplicant);
        setError(null);
      } catch (error) {
        console.error("Failed to fetch applicant:", error);
        setError("Failed to load applicant details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplicantData();
  }, [id]);

  // Function to generate initials for avatar placeholder
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Function to format snake_case to Title Case with spaces
  const formatIdType = (idType: string) => {
    return idType
      .split("_")
      .map((word) =>
        word.toLowerCase() === "id"
          ? "ID"
          : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ");
  };

  // Function to construct proper image URLs
  const getImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return "";

    // If the image path is already a full URL, return it as is
    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    // Server base URL with port 3000 as seen in reference image
    const serverIp = "localhost"; // Use the correct IP for your environment
    const serverPort = "3000";
    const serverBaseUrl = `http://${serverIp}:${serverPort}`;

    // If it includes 'assets/profiles' (as seen in image references)
    if (imagePath.includes("assets/profiles")) {
      return `${serverBaseUrl}/${imagePath}`;
    }

    // For other relative paths, construct the full URL
    // If the path doesn't start with a slash, add one
    const formattedPath = imagePath.startsWith("/")
      ? imagePath
      : `/${imagePath}`;

    return `${serverBaseUrl}${formattedPath}`;
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetImage = () => {
    setZoom(1);
    setRotation(0);
  };

  // Function to ban a user
  const handleBanUser = () => {
    if (confirmBan) {
      setToastType("error");
      setToastMessage("User has been banned successfully");
      setShowToast(true);
      setShowBanDialog(false);
      setConfirmBan(false);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Function to handle verification status update
  const handleVerificationUpdate = async (status: string) => {
    if (!id) return;

    setIsLoading(true); // Keep loading state for UI feedback
    try {
      await updateVerificationStatus(id as string, status);
      setToastType("success");
      setToastMessage(
        `Applicant ${
          status === "verified" ? "approved" : "rejected"
        } successfully`
      );
      setShowToast(true);

      // Update the applicant data with the new status locally for immediate UI update
      if (applicant) {
        setApplicant({
          ...applicant,
          verificationStatus: status === "verified" ? "Verified" : "Rejected",
        });
      }
    } catch (error) {
      console.error(`Failed to update verification status:`, error);
      setToastType("error");
      setToastMessage(
        `Failed to update verification status. Please try again.`
      );
      setShowToast(true);
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  // Add verification action buttons
  const renderVerificationActions = () => {
    if (!applicant) return null;

    // Don't show actions if already verified or rejected
    if (
      applicant.verificationStatus === "Verified" ||
      applicant.verificationStatus === "Rejected"
    ) {
      return null;
    }

    return (
      <div className="flex gap-4 mt-8">
        {applicant?.verificationStatus === "Pending" && (
          <>
            <Button
              onClick={() => handleVerificationUpdate("verified")}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isLoading}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => handleVerificationUpdate("rejected")}
              variant="destructive"
              disabled={isLoading}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </>
        )}
      </div>
    );
  };

  if (!applicant) {
    return (
      <MainLayout>
        <div className="container mx-auto px-6 py-10 md:px-8 lg:px-10">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-8"
            >
              <div className="flex items-center justify-center flex-col gap-6 text-center py-10">
                <Loader className="w-12 h-12 text-blue-500 animate-spin" />
                <h2 className="text-xl font-semibold text-blue-700">
                  Loading applicant data...
                </h2>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-10 md:px-8 lg:px-10">
        {/* Toast notification */}
        {showToast && (
          <div
            className={`fixed top-4 right-4 p-4 rounded-md shadow-md z-50 ${
              toastType === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : toastType === "error"
                ? "bg-red-100 text-red-800 border border-red-200"
                : "bg-yellow-100 text-yellow-800 border border-yellow-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastType === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : toastType === "error" ? (
                <XCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <p>{toastMessage}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-6 mb-10 pb-4 border-b">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="hover:bg-gray-100"
            >
              ← Back to Verification
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              Verification Profile
            </h1>
          </div>
          {applicant && applicant.verificationStatus === "Pending"
            ? renderVerificationActions()
            : null}
          <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!applicant}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white shadow-sm px-6 py-2 rounded-md transition-colors duration-200"
              >
                <Ban className="w-4 h-4" />
                Ban User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-none shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-red-600 text-xl font-semibold">
                  Ban User Confirmation
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to ban this user? This action cannot be
                  undone.
                </p>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="confirm-ban"
                    checked={confirmBan}
                    onCheckedChange={(checked: boolean) =>
                      setConfirmBan(checked)
                    }
                  />
                  <Label
                    htmlFor="confirm-ban"
                    className="text-sm text-gray-600"
                  >
                    I confirm that I want to ban this user
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBanDialog(false);
                    setConfirmBan(false);
                  }}
                  className="hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBanUser}
                  disabled={!confirmBan}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
                >
                  Ban User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <AnimatePresence>
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center items-center py-20"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B153C]"></div>
              )}
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-8"
            >
              <div className="flex items-center justify-center flex-col gap-6 text-center py-10">
                <XCircle className="w-12 h-12 text-red-500" />
                <h2 className="text-xl font-semibold text-red-700">{error}</h2>
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-red-600 hover:bg-red-700 text-white mt-4"
                >
                  Try Again
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-white rounded-lg shadow-lg p-8 mb-10"
            >
              {/* Profile Header with Picture */}
              <div className="flex flex-col md:flex-row items-center gap-8 mb-10 pb-8 border-b">
                <div className="relative">
                  {applicant!.profilePicture ? (
                    <img
                      src={getImageUrl(applicant!.profilePicture)}
                      alt={`${applicant!.firstName} ${applicant!.lastName}`}
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-[#0B153C] text-white flex items-center justify-center text-3xl font-bold border-4 border-white shadow-lg">
                      {getInitials(applicant!.firstName, applicant!.lastName)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {`${applicant!.firstName} ${
                      applicant!.middleName ? applicant!.middleName + " " : ""
                    }${applicant!.lastName}${
                      applicant!.suffix ? " " + applicant!.suffix : ""
                    }`}
                  </h2>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    {applicant!.verificationStatus === "verified" && (
                      <Badge className="bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 text-sm font-medium">
                        Verified
                      </Badge>
                    )}
                    {applicant!.verificationStatus === "rejected" && (
                      <Badge className="bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 text-sm font-medium">
                        Rejected
                      </Badge>
                    )}
                    {applicant!.verificationStatus === "pending" && (
                      <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200 text-sm font-medium">
                        Pending
                      </Badge>
                    )}
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {applicant!.userType}
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      Joined:{" "}
                      {new Date(applicant!.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      First Name
                    </h3>
                    <p className="text-base text-gray-900 mt-2">
                      {applicant!.firstName}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Middle Name
                    </h3>
                    <p className="text-base text-gray-900 mt-2">
                      {applicant!.middleName || "-"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Last Name
                    </h3>
                    <p className="text-base text-gray-900 mt-2">
                      {applicant!.lastName}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Suffix
                    </h3>
                    <p className="text-base text-gray-900 mt-2">
                      {applicant!.suffix || "-"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Age</h3>
                    <p className="text-base text-gray-900 mt-2">
                      {applicant!.age}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Gender
                    </h3>
                    <p className="text-base text-gray-900 mt-2">
                      {applicant!.gender.charAt(0).toUpperCase() +
                        applicant!.gender.slice(1)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Address
                    </h3>
                    <p className="text-base text-gray-900 mt-2">
                      {applicant!.address}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Email Address
                    </h3>
                    <p className="text-base text-gray-900 mt-2">
                      {applicant!.email}
                    </p>
                  </div>
                  {applicant!.phoneNumber && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Phone Number
                      </h3>
                      <p className="text-base text-gray-900 mt-2">
                        {applicant!.phoneNumber}
                      </p>
                    </div>
                  )}
                  {applicant!.userType.toLowerCase() === "job-seeker" &&
                    applicant!.jobTags &&
                    applicant!.jobTags.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">
                          Job Tags
                        </h3>
                        <div className="flex flex-wrap gap-3 mt-4">
                          {applicant!.jobTags.map(
                            (tag: string, index: number) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                              >
                                {tag}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* ID Images Section */}
              <div className="mt-10 border-t border-gray-200 pt-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    ID Verification
                  </h2>
                  {applicant!.idType && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      Type: {formatIdType(applicant!.idType)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-10">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-500">
                      Front ID
                    </h3>
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="aspect-[4/3] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group">
                          {applicant!.idFrontImage ? (
                            <div className="relative w-full h-full overflow-hidden rounded-lg">
                              <img
                                src={getImageUrl(applicant!.idFrontImage)}
                                alt="ID Front"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all flex items-center justify-center">
                                <p className="text-transparent hover:text-white font-medium">
                                  Click to view
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <svg
                                className="mx-auto h-12 w-12 text-gray-400 group-hover:text-gray-500 transition-colors"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              <p className="mt-2 text-sm text-gray-500 group-hover:text-gray-600">
                                No ID Front Image Available
                              </p>
                            </div>
                          )}
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl bg-white p-6 rounded-xl shadow-2xl">
                        <DialogHeader className="pb-4 border-b border-gray-200">
                          <DialogTitle className="text-xl font-semibold text-gray-900">
                            ID Front Image
                          </DialogTitle>
                        </DialogHeader>
                        <div className="relative mt-6">
                          <div className="relative aspect-[4/3] bg-gray-50 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                            <div
                              className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"
                              style={{
                                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                transition: "transform 0.2s ease-in-out",
                              }}
                            >
                              <img
                                src={getImageUrl(applicant!.idFrontImage) || "/placeholder-id-front.jpg"}
                                alt="ID Front"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          </div>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleZoomOut}
                              className="hover:bg-gray-100 text-gray-600"
                            >
                              <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={resetImage}
                              className="hover:bg-gray-100 text-gray-600"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleRotate}
                              className="hover:bg-gray-100 text-gray-600"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleZoomIn}
                              className="hover:bg-gray-100 text-gray-600"
                            >
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-500">
                      Back ID
                    </h3>
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="aspect-[4/3] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group">
                          {applicant!.idBackImage ? (
                            <div className="relative w-full h-full overflow-hidden rounded-lg">
                              <img
                                src={getImageUrl(applicant!.idBackImage)}
                                alt="ID Back"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all flex items-center justify-center">
                                <p className="text-transparent hover:text-white font-medium">
                                  Click to view
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <svg
                                className="mx-auto h-12 w-12 text-gray-400 group-hover:text-gray-500 transition-colors"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              <p className="mt-2 text-sm text-gray-500 group-hover:text-gray-600">
                                No ID Back Image Available
                              </p>
                            </div>
                          )}
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl bg-white p-6 rounded-xl shadow-2xl">
                        <DialogHeader className="pb-4 border-b border-gray-200">
                          <DialogTitle className="text-xl font-semibold text-gray-900">
                            ID Back Image
                          </DialogTitle>
                        </DialogHeader>
                        <div className="relative mt-6">
                          <div className="relative aspect-[4/3] bg-gray-50 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                            <div
                              className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"
                              style={{
                                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                transition: "transform 0.2s ease-in-out",
                              }}
                            >
                              <img
                                src={getImageUrl(applicant!.idBackImage) || "/placeholder-id-back.jpg"}
                                alt="ID Back"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          </div>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleZoomOut}
                              className="hover:bg-gray-100 text-gray-600"
                            >
                              <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={resetImage}
                              className="hover:bg-gray-100 text-gray-600"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleRotate}
                              className="hover:bg-gray-100 text-gray-600"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleZoomIn}
                              className="hover:bg-gray-100 text-gray-600"
                            >
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast Notification */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${
                toastType === "success"
                  ? "bg-green-500"
                  : toastType === "error"
                  ? "bg-red-500"
                  : "bg-yellow-500"
              } text-white`}
            >
              {toastType === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : toastType === "error" ? (
                <XCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
};

export default VerificationProfilePage;
