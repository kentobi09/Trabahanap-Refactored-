import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (newToken: string, userDetails?: any) => void; // Allow storing some user details
  logout: () => void;
  isLoading: boolean;
  adminUser: any; // To store basic admin user details
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("adminUser");
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      if (storedUser) {
        try {
          setAdminUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse admin user from localStorage", e);
          localStorage.removeItem("adminUser"); // Clear corrupted data
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, userDetails?: any) => {
    localStorage.setItem("authToken", newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    if (userDetails) {
      localStorage.setItem("adminUser", JSON.stringify(userDetails));
      setAdminUser(userDetails);
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("adminUser");
    setToken(null);
    setAdminUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, token, adminUser, login, logout, isLoading }}
    >
      {!isLoading && children}
    </AuthContext.Provider>
  );
};
