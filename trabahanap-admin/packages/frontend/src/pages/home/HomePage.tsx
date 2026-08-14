import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout/MainLayout";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { 
  getTotalUsers, 
  getTotalJobs, 
  getTotalApplicants, 
  getMonthlyApplications, 
  getMonthlyUsers 
} from "../../services/home_api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const HomePage = () => {
  const navigate = useNavigate();
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [totalJobs, setTotalJobs] = useState<number | null>(null);
  const [totalApplicants, setTotalApplicants] = useState<number | null>(null);
  const [monthlyApplicationsData, setMonthlyApplicationsData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [monthlyUsersData, setMonthlyUsersData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate("/login");
    } else {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          // Fetch total counts
          const usersData = await getTotalUsers();
          if (usersData && typeof usersData.total_users === "number") {
            setTotalUsers(usersData.total_users);
          } else {
            console.error(
              "Invalid data format received for total users:",
              usersData
            );
            setTotalUsers(0);
          }

          const jobsData = await getTotalJobs();
          if (jobsData && typeof jobsData.total_jobs === "number") {
            setTotalJobs(jobsData.total_jobs);
          } else {
            console.error(
              "Invalid data format received for total jobs:",
              jobsData
            );
            setTotalJobs(0);
          }

          const applicantsData = await getTotalApplicants();
          if (applicantsData && typeof applicantsData.total_applicants === "number") {
            setTotalApplicants(applicantsData.total_applicants);
          } else {
            console.error(
              "Invalid data format received for total applicants:",
              applicantsData
            );
            setTotalApplicants(0);
          }

          // Fetch monthly data for charts
          const monthlyApps = await getMonthlyApplications();
          if (monthlyApps && monthlyApps.monthly_data) {
            setMonthlyApplicationsData(monthlyApps.monthly_data);
          } else {
            console.error(
              "Invalid data format received for monthly applications:",
              monthlyApps
            );
          }

          const monthlyUsers = await getMonthlyUsers();
          if (monthlyUsers && monthlyUsers.monthly_data) {
            setMonthlyUsersData(monthlyUsers.monthly_data);
          } else {
            console.error(
              "Invalid data format received for monthly users:",
              monthlyUsers
            );
          }
        } catch (error) {
          console.error("Failed to fetch dashboard data:", error);
          setTotalUsers(0);
          setTotalJobs(0);
          setTotalApplicants(0);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [navigate]);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const applicationsData = {
    labels: months,
    datasets: [
      {
        label: "Applications",
        data: isLoading ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] : monthlyApplicationsData,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const usersData = {
    labels: months,
    datasets: [
      {
        label: "Users",
        data: isLoading ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] : monthlyUsersData,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <MainLayout>
      <div className="space-y-8 p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Users */}
          <div className="bg-gradient-to-br from-indigo-50 to-white overflow-hidden shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-100 p-3 rounded-lg">
                  <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-600 truncate">
                      Total Users
                    </dt>
                    <dd className="text-3xl font-bold text-gray-900">
                      {totalUsers === null ? "Loading..." : totalUsers}
                    </dd>

                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Active Jobs */}
          <div className="bg-gradient-to-br from-emerald-50 to-white overflow-hidden shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-emerald-100 p-3 rounded-lg">
                  <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-600 truncate">
                      Active Jobs
                    </dt>
                    <dd className="text-3xl font-bold text-gray-900">
                      {totalJobs === null ? "Loading..." : totalJobs}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Total Applications */}
          <div className="bg-gradient-to-br from-purple-50 to-white overflow-hidden shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 p-3 rounded-lg">
                  <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-600 truncate">Total Applications</dt>
                    <dd className="text-3xl font-bold text-gray-900">
                      {totalApplicants === null ? "Loading..." : totalApplicants}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Charts */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Applications Chart */}
          <div className="bg-white p-6 rounded-xl shadow-lg overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Applications</h2>
            <div className="relative" style={{ minHeight: "300px" }}>
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <Line data={applicationsData} options={chartOptions} />
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">Monthly application count trends</p>
          </div>

          {/* Users Chart */}
          <div className="bg-white p-6 rounded-xl shadow-lg overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Verified Users</h2>
            <div className="relative" style={{ minHeight: "300px" }}>
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
                </div>
              ) : (
                <Line data={usersData} options={chartOptions} />
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">Monthly verified user count trends</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
