import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import { NotificationPanel } from '../notifications/NotificationPanel';
import { motion } from 'framer-motion';
import ediskarteLogo from '../../assets/ediskarte-logo.png';
import { logoutUser, getCurrentAdmin, getToken } from '../../services/auth';
import { useNotifications } from '../../context/NotificationContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

interface AdminDetails {
  full_name: string;
  email: string;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [adminDetails, setAdminDetails] = useState<AdminDetails | null>(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    notifications,
    markOneAsRead,
    markAllAsRead,
    unreadCount,
  } = useNotifications();

  useEffect(() => {
    let isMounted = true;
    setIsLoadingAdmin(true);

    const verifyAuthAndFetchData = async () => {
      const token = getToken();

      if (!token) {
        if (isMounted) {
          setAdminDetails(null);
          setIsLoadingAdmin(false);
          if (location.pathname !== '/login') {
            navigate('/login');
          } else {
          }
        }
        return;
      }

      try {
        const data = await getCurrentAdmin();

        setAdminDetails(data);
        setIsLoadingAdmin(false); 

        if (isMounted && location.pathname === '/login') { 
          navigate('/');
        }

      } catch (error) {
        console.error("Authentication failed or error fetching admin details:", error); 
        if (isMounted) { 
          logoutUser();
          setAdminDetails(null);
          setIsLoadingAdmin(false); 
          if (location.pathname !== '/login') {
            navigate('/login');
          }
        }
      } 
    };

    verifyAuthAndFetchData();

    return () => {
      isMounted = false;
    };
  }, [navigate, location.pathname]);

  const handleSignOut = () => {
    logoutUser();
    sessionStorage.clear();
    setIsProfileOpen(false);
    navigate('/login');
  };

  if (isLoadingAdmin) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-[100]">
        <div className="text-xl font-semibold text-gray-700">Loading Dashboard...</div>
        {/* You can replace this with a more sophisticated spinner component */}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 bg-[#0B153C] shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="h-6 w-6" />
                ) : (
                  <ChevronLeft className="h-6 w-6" />
                )}
              </button>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setIsNotificationPanelOpen(true)}
                className="relative p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
              >
                <span className="sr-only">View notifications</span>
                <div className="relative">
                  <svg
                    className="h-7 w-7 transition-transform duration-200 group-hover:scale-110"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 rounded-full text-sm text-white flex items-center justify-center font-medium shadow-lg"
                    >
                      {unreadCount}
                    </motion.span>
                  )}
                </div>
              </button>

              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-3 text-white/80 hover:text-white transition-colors relative"
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-lg shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      {isLoadingAdmin ? (
                        <p className="text-sm text-gray-700">Loading...</p>
                      ) : adminDetails ? (
                        <>
                          <p className="text-sm font-medium text-gray-900 truncate">{adminDetails.full_name || 'Admin'}</p>
                          <p className="text-xs text-gray-500 truncate">{adminDetails.email || 'admin@example.com'}</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-700">Could not load details.</p>
                      )}
                    </div>

                    <div className="py-1">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={handleSignOut}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleSignOut();
                          }
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <svg
                          className="mr-3 h-4 w-4 text-gray-400 group-hover:text-red-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Sign out
                      </div>
                    </div>
                  </motion.div>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        <aside 
          className={`fixed left-0 top-16 bg-white shadow-md h-[calc(100vh-4rem)] transition-all duration-300 ${
            isSidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          <div className={`px-4 pt-12 pb-4 border-b border-gray-100 ${isSidebarCollapsed ? 'px-2' : ''}`}>
            <div className="flex items-center justify-center">
              <img 
                src={ediskarteLogo} 
                alt="Ediskarte Logo" 
                className={`${isSidebarCollapsed ? 'h-12' : 'h-20'} w-auto object-contain`}
              />
            </div>
          </div>
          
          <nav className="mt-8 px-3 space-y-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `group flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'text-[#0B153C] bg-[#0B153C]/5'
                    : 'text-gray-600 hover:bg-[#0B153C]/5 hover:text-[#0B153C]'
                } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`
              }
            >
              <svg className={`${isSidebarCollapsed ? 'mr-0' : 'mr-4'} h-6 w-6 ${
                location.pathname === '/' ? 'text-[#0B153C]' : 'text-gray-400 group-hover:text-[#0B153C]'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {!isSidebarCollapsed && <span>Dashboard</span>}
            </NavLink>

            <NavLink
              to="/verification"
              className={({ isActive }) =>
                `group flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'text-[#0B153C] bg-[#0B153C]/5'
                    : 'text-gray-600 hover:bg-[#0B153C]/5 hover:text-[#0B153C]'
                } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`
              }
            >
              <svg className={`${isSidebarCollapsed ? 'mr-0' : 'mr-4'} h-6 w-6 ${
                location.pathname.startsWith('/verification') ? 'text-[#0B153C]' : 'text-gray-400 group-hover:text-[#0B153C]'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {!isSidebarCollapsed && <span>Verification</span>}
            </NavLink>

            <NavLink
              to="/job-request"
              className={({ isActive }) =>
                `group flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'text-[#0B153C] bg-[#0B153C]/5'
                    : 'text-gray-600 hover:bg-[#0B153C]/5 hover:text-[#0B153C]'
                } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`
              }
            >
              <svg className={`${isSidebarCollapsed ? 'mr-0' : 'mr-4'} h-6 w-6 ${
                location.pathname.startsWith('/job-request') ? 'text-[#0B153C]' : 'text-gray-400 group-hover:text-[#0B153C]'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {!isSidebarCollapsed && <span>Job Request</span>}
            </NavLink>

            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `group flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'text-[#0B153C] bg-[#0B153C]/5'
                    : 'text-gray-600 hover:bg-[#0B153C]/5 hover:text-[#0B153C]'
                } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`
              }
            >
              <svg className={`${isSidebarCollapsed ? 'mr-0' : 'mr-4'} h-6 w-6 ${
                location.pathname.startsWith('/reports') ? 'text-[#0B153C]' : 'text-gray-400 group-hover:text-[#0B153C]'
              }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {!isSidebarCollapsed && <span>User Report</span>}
            </NavLink>
          </nav>
        </aside>

        <main className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>

      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        notifications={notifications}
        onMarkAsRead={markOneAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </div>
  );
};
