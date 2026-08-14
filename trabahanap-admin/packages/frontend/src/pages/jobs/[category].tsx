import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { Button } from '../../components/ui/button';
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

interface JobUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'Active' | 'Inactive';
  rating: number;
  completedJobs: number;
}

const JobUsersPage = () => {
  const { category } = useParams();
  const navigate = useNavigate();

  // Mock data - replace with actual API call
  const users: JobUser[] = [
    {
      id: "1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      status: "Active",
      rating: 4.8,
      completedJobs: 45
    },
    {
      id: "2",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      status: "Active",
      rating: 4.9,
      completedJobs: 67
    },
    {
      id: "3",
      firstName: "Mike",
      lastName: "Johnson",
      email: "mike@example.com",
      status: "Inactive",
      rating: 4.5,
      completedJobs: 23
    },
  ];

  const handleViewProfile = (userId: string) => {
    navigate(`/users/${userId}`);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/jobs')}
            className="hover:bg-gray-100"
          >
            ← Back to Jobs
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{category} Users</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Completed Jobs</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span className="text-yellow-500 mr-1">★</span>
                      {user.rating}
                    </div>
                  </TableCell>
                  <TableCell>{user.completedJobs}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewProfile(user.id)}
                      className="hover:bg-gray-100"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default JobUsersPage; 