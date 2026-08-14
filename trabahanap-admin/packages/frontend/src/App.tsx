import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { LoginPage } from "./pages/login/LoginPage";
import { HomePage } from "./pages/home/HomePage";
import VerificationPage from "./pages/verification";
import VerificationProfilePage from "./pages/verification/[id]";
import JobsPage from "./pages/jobs";
import JobUsersPage from "./pages/jobs/JobUsersPage";
import ReportsPage from "./pages/reports";
import JobRequestPage from "./pages/job-request";
import JobRequestDetailsPage from "./pages/job-request/[id]";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/verification" element={<VerificationPage />} />
            <Route path="/verification/:id" element={<VerificationProfilePage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:category" element={<JobUsersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/job-request" element={<JobRequestPage />} />
            <Route path="/job-request/:id" element={<JobRequestDetailsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </NotificationProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
