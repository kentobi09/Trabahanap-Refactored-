import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { Button } from '../../components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { PowerOff, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';

interface User {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  age: number;
  gender: string;
  address: string;
  email: string;
  userType: 'Admin' | 'Employer' | 'Job-seeker';
  status: 'Active' | 'Inactive';
  rating: number;
  completedJobs: number;
  profilePicture?: string;
}

const UserProfilePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Mock data - replace with actual API call
  const user: User = {
    id: id || "1",
    firstName: "John",
    middleName: "Smith",
    lastName: "Doe",
    suffix: "Jr.",
    age: 28,
    gender: "Male",
    address: "123 Main Street, City, Country",
    email: "john@example.com",
    userType: "Job-seeker",
    status: "Active",
    rating: 4.8,
    completedJobs: 45,
    profilePicture: undefined
  };

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const handleDeactivateUser = () => {
    if (confirmDeactivate) {
      console.log('Deactivating user:', user.id);
      setShowDeactivateDialog(false);
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);
    }
  };

  const handleBanUser = async (reason: string = "Violation of terms") => {
    try {
      await fetch(`http://localhost:8000/api/users/${user.id}/ban?reason=${encodeURIComponent(reason)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
      });
      alert(`User ${user.email} has been banned.`);
      setShowDeactivateDialog(false);
    } catch (err) {
      console.error(err);
      alert("Failed to ban user.");
    }
  };

  const handleSuspendUser = async (days: number = 7, reason: string = "Temporary suspension") => {
    try {
      await fetch(`http://localhost:8000/api/users/${user.id}/suspend?days=${days}&reason=${encodeURIComponent(reason)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
      });
      alert(`User ${user.email} has been suspended for ${days} days.`);
      setShowDeactivateDialog(false);
    } catch (err) {
      console.error(err);
      alert("Failed to suspend user.");
    }
  };

  const handleUnbanUser = async () => {
    try {
      await fetch(`http://localhost:8000/api/users/${user.id}/unban`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
      });
      alert(`User ${user.email} has been reactivated.`);
      setShowDeactivateDialog(false);
    } catch (err) {
      console.error(err);
      alert("Failed to reactivate user.");
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
        </div>

        <AnimatePresence>
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center items-center h-64"
            >
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B153C]"></div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              {/* Profile Header with Picture */}
              <div className="flex flex-col md:flex-row items-center gap-6 mb-8 pb-8 border-b">
                <div className="relative">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-[#0B153C] flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                      {getInitials(user.firstName, user.lastName)}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {`${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}${user.suffix ? ' ' + user.suffix : ''}`}
                  </h2>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeactivateDialog(true)}
                    className={`flex items-center gap-2 ${
                      user.status === 'Active' 
                        ? 'text-red-600 hover:bg-red-50 hover:text-red-700' 
                        : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                    }`}
                  >
                    <PowerOff className="w-4 h-4" />
                    {user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">First Name</h3>
                    <p className="text-base text-gray-900 mt-1">{user.firstName}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Middle Name</h3>
                    <p className="text-base text-gray-900 mt-1">{user.middleName}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Last Name</h3>
                    <p className="text-base text-gray-900 mt-1">{user.lastName}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Suffix</h3>
                    <p className="text-base text-gray-900 mt-1">{user.suffix}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Age</h3>
                    <p className="text-base text-gray-900 mt-1">{user.age}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Gender</h3>
                    <p className="text-base text-gray-900 mt-1">{user.gender}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Address</h3>
                    <p className="text-base text-gray-900 mt-1">{user.address}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email Address</h3>
                    <p className="text-base text-gray-900 mt-1">{user.email}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">User Type</h3>
                    <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                      user.userType === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                      user.userType === 'Employer' ? 'bg-blue-100 text-blue-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.userType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Section */}
              <div className="mt-8 pt-8 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Rating</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500 text-2xl">★</span>
                      <span className="text-2xl font-bold text-gray-900">{user.rating}</span>
                      <span className="text-gray-500">/ 5.0</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Completed Jobs</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">{user.completedJobs}</span>
                      <span className="text-gray-500">jobs</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent className="bg-white border-none shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-red-600 text-xl font-semibold">
              {user.status === 'Active' ? 'Deactivate User' : 'Activate User'} Confirmation
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 mb-4">
              {user.status === 'Active' 
                ? 'Are you sure you want to deactivate this user? They will not be able to access the platform until reactivated.'
                : 'Are you sure you want to activate this user? They will regain access to the platform.'}
            </p>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm-deactivate"
                checked={confirmDeactivate}
                onCheckedChange={(checked: boolean) => setConfirmDeactivate(checked)}
              />
              <label htmlFor="confirm-deactivate" className="text-sm text-gray-600">
                I confirm that I want to {user.status === 'Active' ? 'deactivate' : 'activate'} this user
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeactivateDialog(false);
                setConfirmDeactivate(false);
              }}
              className="hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              variant={user.status === 'Active' ? 'destructive' : 'default'}
              onClick={handleDeactivateUser}
              disabled={!confirmDeactivate}
              className={user.status === 'Active' 
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
              }
            >
              {user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          User has been {user.status === 'Active' ? 'deactivated' : 'activated'} successfully!
        </div>
      )}
    </MainLayout>
  );
};

export default UserProfilePage; 