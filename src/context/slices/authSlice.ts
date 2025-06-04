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
    
    // Developers have access to all service types
    if (currentUser.role === 'developer') {
      return true;
    }
    
    // Check permissions for allowed service types
    if (currentUser.permissions?.allowedServiceTypes) {
      return currentUser.permissions.allowedServiceTypes.includes(serviceType);
    }
    
    // Fallback to old serviceTypeAccess field if still populated
    if (currentUser.serviceTypeAccess && currentUser.serviceTypeAccess.length > 0) {
      return currentUser.serviceTypeAccess.includes(serviceType);
    }
    
    return false;
  };

  const loginWithGoogle = async (idToken: string): Promise<boolean> => {
    setIsLoadingAuth(true);
    try {
      const response: AuthResponse = await authService.loginWithGoogle(idToken);
      if (response.token && response.user) {
        storeToken(response.token);
        setCurrentUser(response.user);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Google login failed:', error);
      removeToken();
      setIsAuthenticated(false);
      setCurrentUser(null);
      return false;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  return {
    currentUser,
    isAuthenticated,
    isLoadingAuth,
    login,
    logout,
    hasServiceTypeAccess,
    loginWithGoogle,
  };
};
