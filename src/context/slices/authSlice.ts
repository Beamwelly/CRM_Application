import { useState, useEffect, useCallback } from 'react';
import { User, Role, LoginCredentials, AuthResponse, ServiceType } from '@/types';
import { authService } from '@/services/authService';
import { api } from '@/services/api';

// Define the expected structure of the decoded JWT payload
// interface JwtPayload { ... } // No longer needed here if verifyToken handles it

export interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

export interface AuthActions {
  // Update login signature - Role is determined by backend now
  login: (credentials: Omit<LoginCredentials, 'role'>) => Promise<boolean>; 
  logout: () => void;
  hasServiceTypeAccess: (serviceType: ServiceType) => boolean;
  // Add new action for Google Login
  loginWithGoogle: (idToken: string) => Promise<boolean>; 
}

export const useAuthSlice = (/* users parameter might not be needed anymore */): AuthState & AuthActions => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  const storeToken = (token: string) => localStorage.setItem('authToken', token);
  const getToken = () => localStorage.getItem('authToken');
  const removeToken = () => localStorage.removeItem('authToken');

  const verifyAndSetUser = useCallback(async (token: string) => {
    setIsLoadingAuth(true);
    try {
      console.log("Verifying token...");
      const user = await authService.verifyToken(token);
      console.log("Token verified, user:", user);
      setCurrentUser(user);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Token verification failed on load:", error);
      removeToken();
      setCurrentUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (token) {
      verifyAndSetUser(token);
    } else {
      setIsLoadingAuth(false); // No token, not loading
    }
  }, [verifyAndSetUser]);

  // Update login function signature
  const login = async (credentials: Omit<LoginCredentials, 'role'>): Promise<boolean> => {
    setIsLoadingAuth(true);
    try {
      const response: AuthResponse = await authService.login(credentials);
      
      if (response.token && response.user) {
        console.log("Login response successful, user data:", response.user);
        storeToken(response.token);
        setCurrentUser(response.user);
        setIsAuthenticated(true);
        console.log("Current user set in state:", response.user);
        return true;
      } else {
        console.error("Login response missing token or user data");
        setIsAuthenticated(false);
        setCurrentUser(null);
        return false;
      }
    } catch (error) {
      console.error('Login failed in authSlice:', error);
      removeToken();
      setIsAuthenticated(false);
      setCurrentUser(null);
      return false;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    console.log("Logging out user...");
    removeToken();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Updated logic: check currentUser.permissions
  const hasServiceTypeAccess = (serviceType: ServiceType): boolean => {
    if (!currentUser) return false;
    // Developers, Admins, and (for now) Employees have access to all service types
    if (currentUser.role === 'developer' || currentUser.role === 'admin' || currentUser.role === 'employee') {
      // TODO: Refine employee access later based on specific permissions
      return true; 
    }
    /* 
    // Check employee permissions (assuming permissions structure accommodates this)
    // This check depends heavily on how you define service access within permissions
    // Example: Check a specific permission flag or an array within permissions
    // return currentUser.permissions?.allowedServices?.includes(serviceType) ?? false;
    
    // Fallback to old serviceTypeAccess field if still populated and relevant
    if (currentUser.serviceTypeAccess && currentUser.serviceTypeAccess.length > 0) {
      return currentUser.serviceTypeAccess.includes(serviceType);
    }
    */
    
    // Default to false if no explicit permission found (shouldn't be reached with current logic)
    return false; 
  };

  // --- Add Google Login Function --- 
  const loginWithGoogle = async (idToken: string): Promise<boolean> => {
      setIsLoadingAuth(true);
      try {
          console.log("[AuthSlice] Attempting Google Sign-In with backend...");
          // Call the backend endpoint
          const response = await api.post('/auth/google', { token: idToken });
          const authResponse = response as AuthResponse; // Assert type

          if (authResponse.token && authResponse.user) {
              console.log("[AuthSlice] Google Sign-In successful, user data:", authResponse.user);
              storeToken(authResponse.token);
              setCurrentUser(authResponse.user);
              setIsAuthenticated(true);
              return true;
          } else {
              console.error("[AuthSlice] Google Sign-In backend response missing token or user data");
              removeToken(); // Ensure no partial login state
              setIsAuthenticated(false);
              setCurrentUser(null);
              return false;
          }
      } catch (error) {
          console.error('[AuthSlice] Google Sign-In failed:', error);
          removeToken();
          setIsAuthenticated(false);
          setCurrentUser(null);
          return false;
      } finally {
          setIsLoadingAuth(false);
      }
  };
  // --- End Google Login Function --- 

  return {
    currentUser,
    isAuthenticated,
    isLoadingAuth,
    login,
    logout,
    hasServiceTypeAccess,
    loginWithGoogle, // Return the new function
  };
};
