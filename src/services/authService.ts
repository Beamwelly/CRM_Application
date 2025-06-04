import { api } from './api';
import { LoginCredentials, AuthResponse, User, ServiceType, Role, UserPermissions } from '@/types'; // Import new types

// Update JwtPayload interface to only contain essential fields from the token for initial validation
interface JwtPayload {
  id: string; // Essential for fetching full profile
  iat?: number;
  exp?: number; // Essential for expiration check
}

/**
 * Attempts to log in a user by sending credentials to the backend API.
 * Assumes the backend has an endpoint like POST /api/auth/login.
 * Role is determined by the backend.
 * @param credentials User's email and password.
 * @returns Promise resolving to the authentication response (e.g., user data and token).
 */
const login = async (credentials: Omit<LoginCredentials, 'role'>): Promise<AuthResponse> => { // Role removed from input type
  try {
    // Send only email and password to the backend
    // MODIFIED: Added /api prefix
    const response = await api.post('/api/auth/login', credentials);
    console.log('Login successful:', response);
    // Assuming backend returns the full AuthResponse with user object including role/permissions
    return response as AuthResponse;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

/**
 * Verifies a token by fetching the user's profile from the backend.
 * @param token The JWT token string (though not directly used if interceptor handles it).
 * @returns Promise resolving to the User object if token is valid and profile is fetched.
 * @throws Error if token is invalid, expired, or profile fetch fails.
 */
const verifyToken = async (token: string): Promise<User> => { // token param might be unused if relying on interceptor
  try {
    // Basic client-side check for token structure and expiration (optional, backend is source of truth)
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) {
      throw new Error("Invalid token format");
    }
    const decoded: JwtPayload = JSON.parse(atob(payloadBase64));

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      throw new Error("Token expired (client-side check)");
    }

    if (!decoded.id) {
      throw new Error("Invalid token payload - missing user ID (client-side check)");
    }

    // Fetch the full user profile from the backend
    // The auth token should be automatically included by the axios interceptor
    console.log(`[authService] Client-side token check passed for user ID: ${decoded.id}. Fetching full profile...`);
    // MODIFIED: Added /api prefix
    const fullUserProfileResponse = await api.get('/api/auth/me'); // Endpoint for fetching user profile

    if (!fullUserProfileResponse || typeof fullUserProfileResponse !== 'object') {
      throw new Error('Invalid user profile data received from /api/auth/me');
    }

    const userProfile = fullUserProfileResponse as User;
    // Add more robust validation for the userProfile object
    if (!userProfile.id || !userProfile.email || !userProfile.name || !userProfile.role) {
      console.error("[authService] Fetched user profile is missing required fields:", userProfile);
      throw new Error('Fetched user profile is incomplete.');
    }

    console.log("[authService] Full user profile fetched successfully:", userProfile);
    return userProfile;

  } catch (error) {
    console.error("Token verification and profile fetch failed:", error);
    if (error instanceof Error && error.message.includes('Request failed')) {
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
    // Re-throw original error or a new one if it's not already informative
    throw error instanceof Error ? error : new Error("Invalid or expired token, or failed to fetch profile.");
  }
};

/**
 * Placeholder for logout functionality.
 */
const logout = async () => {
  // TODO: Implement logout logic
  // e.g., await api.post('/api/auth/logout'); // Ensure this path is correct if implemented
  localStorage.removeItem('authToken'); // Example: Clear token from localStorage
  // Reset any user state in your application (e.g., Zustand, Redux, Context)
  console.log('User logged out (frontend)');
};

export const authService = {
  login,
  logout,
  verifyToken,
};