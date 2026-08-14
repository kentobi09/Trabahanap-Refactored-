import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { toast, TypeOptions } from 'react-toastify';
import { useAuth } from './AuthContext'; // To get the auth token
import { useNavigate } from 'react-router-dom'; // Added import

// Interface for raw messages from WebSocket
interface RawNotificationMessage {
  type: string; // e.g., 'verification_approved', 'report_rejected'
  message: string;
  details?: Record<string, any>;
}

// Interface for notifications displayed in the UI (e.g., panel)
export interface UINotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error'; // Aligns with toast types
  read: boolean;
  details?: Record<string, any>;
}

interface NotificationContextType {
  notifications: UINotification[];
  markOneAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAllNotifications: () => void; // Optional: to clear the panel
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

const NOTIFICATIONS_STORAGE_KEY = 'trabahanap_admin_notifications';
// Consider a limit for stored notifications to avoid localStorage quota issues
const MAX_STORED_NOTIFICATIONS = 100; 

const getWebSocketURL = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = import.meta.env.MODE === 'development' 
    ? 'localhost:8000' // Your backend dev server
    : window.location.host; // Production host
  return `${protocol}//${host}/admin/ws/notifications`;
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { token, isAuthenticated } = useAuth(); // Get adminUser for potential user-specific key
  const WS_URL = getWebSocketURL();
  const navigate = useNavigate(); // Added navigate hook

  // Adjust storage key if adminUser info is available and unique
  // const userSpecificNotificationsKey = adminUser?.id 
  //   ? `${NOTIFICATIONS_STORAGE_KEY}_${adminUser.id}` 
  //   : NOTIFICATIONS_STORAGE_KEY;

  const [uiNotifications, setUiNotifications] = useState<UINotification[]>(() => {
    if (!isAuthenticated) return []; // Don't load if not authenticated
    try {
      const storedNotifications = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY); // Use userSpecificNotificationsKey here if implemented
      return storedNotifications ? JSON.parse(storedNotifications) : [];
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
      return [];
    }
  });

  // Effect to save notifications to localStorage whenever they change
  useEffect(() => {
    if (!isAuthenticated) return; // Don't save if not authenticated / logging out
    try {
      // Prune older notifications if exceeding limit before saving
      const notificationsToSave = uiNotifications.slice(0, MAX_STORED_NOTIFICATIONS);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notificationsToSave)); // Use userSpecificNotificationsKey here
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }, [uiNotifications, isAuthenticated]); // Add userSpecificNotificationsKey if implemented
  
  // Effect to clear notifications from localStorage on logout
  useEffect(() => {
    if (!isAuthenticated && localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)) {
      localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY); // Clear on logout
      setUiNotifications([]); // also clear from state
    }
  }, [isAuthenticated]);

  const socketUrlWithToken = isAuthenticated && token 
    ? `${WS_URL}?token=${encodeURIComponent(token)}` 
    : null;

  const { lastMessage, readyState } = useWebSocket(socketUrlWithToken, {
    shouldReconnect: (_closeEvent) => true, 
    reconnectAttempts: 10,
    reconnectInterval: (attemptNumber) => Math.min(Math.pow(2, attemptNumber) * 1000, 30000),
  }, isAuthenticated && !!socketUrlWithToken);

  useEffect(() => {
    if (lastMessage !== null && isAuthenticated) { // Only process if authenticated
      try {
        const rawNotification = JSON.parse(lastMessage.data as string) as RawNotificationMessage;
        
        if (import.meta.env.MODE === 'development') {
            console.log('Received raw notification:', rawNotification);
        }

        let toastType: TypeOptions = 'info';
        let uiNotificationType: UINotification['type'] = 'info';
        const lowerCaseType = rawNotification.type.toLowerCase();

        if (lowerCaseType.includes('approved') || lowerCaseType.includes('success') || lowerCaseType.includes('verified')) {
          toastType = 'success';
          uiNotificationType = 'success';
        } else if (lowerCaseType.includes('rejected') || lowerCaseType.includes('error') || lowerCaseType.includes('failed')) {
          toastType = 'error';
          uiNotificationType = 'error';
        } else if (lowerCaseType.includes('warning') || lowerCaseType.includes('pending')) {
          // For 'pending' like 'new_verification_request' or 'new_report_filed', use 'info' or a custom style if preferred
          // For actual warnings, use 'warning'
          // Defaulting to 'info' for general pending notifications to match blue style
          toastType = rawNotification.type.includes('warning') ? 'warning' : 'info'; 
          uiNotificationType = rawNotification.type.includes('warning') ? 'warning' : 'info';
        }

        toast(rawNotification.message, { 
          type: toastType,
          onClick: () => {
            let targetPath = '';
            const backendNotificationType = rawNotification.type;

            if (backendNotificationType) {
              switch (backendNotificationType) {
                case 'new_verification_request':
                case 'verification_approved':
                case 'verification_rejected':
                  targetPath = '/verification';
                  break;
                case 'new_report_filed':
                case 'report_approved':
                case 'report_rejected':
                  targetPath = '/reports'; 
                  break;
                default:
                  break;
              }
            }
            if (targetPath) {
              navigate(targetPath);
            }
            // Toast will close on click by default
          }
        });

        const newUINotification: UINotification = {
          id: Date.now().toString() + Math.random().toString(),
          title: rawNotification.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          message: rawNotification.message,
          timestamp: new Date().toISOString(),
          type: uiNotificationType,
          read: false,
          details: {
            ...rawNotification.details,
            type: rawNotification.type
          },
        };

        // Add to the beginning and ensure we don't store duplicates by message and type (simple check)
        setUiNotifications(prev => {
          const exists = prev.find(n => n.message === newUINotification.message && n.title === newUINotification.title && !n.read);
          if (exists) return prev; // Avoid adding if similar unread notification exists
          const updated = [newUINotification, ...prev];
          return updated.slice(0, MAX_STORED_NOTIFICATIONS); // Prune here too
        });
        
      } catch (error) {
        console.error('Failed to parse notification or show toast:', error);
        if (import.meta.env.MODE === 'development') {
            toast.error('Received an invalid notification format from the server.');
        }
      }
    }
  }, [lastMessage, isAuthenticated]); // Add isAuthenticated here

  const markOneAsRead = (id: string) => {
    setUiNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setUiNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setUiNotifications([]); // This will trigger the useEffect to save the empty array to localStorage
  };

  const unreadCount = uiNotifications.filter(n => !n.read).length;

  useEffect(() => {
    if (import.meta.env.MODE === 'development' && isAuthenticated) { 
      const connectionStatus = {
        [ReadyState.CONNECTING]: 'Connecting',
        [ReadyState.OPEN]: 'Open',
        [ReadyState.CLOSING]: 'Closing',
        [ReadyState.CLOSED]: 'Closed',
        [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
      }[readyState];
      console.log(`Notification WebSocket status: ${connectionStatus} for URL: ${socketUrlWithToken ? WS_URL : 'No token/Not authenticated'}`);
    }
  }, [readyState, isAuthenticated, socketUrlWithToken, WS_URL]);

  return (
    <NotificationContext.Provider value={{ 
        notifications: uiNotifications, 
        markOneAsRead, 
        markAllAsRead, 
        clearAllNotifications, 
        unreadCount 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
