import { api } from './api';
import { LoginCredentials, AuthResponse, User, ServiceType, Role, UserPermissions } from '@/types'; // Import new types

// Update JwtPayload interface to only contain essential fields from the token for initial validation
interface JwtPayload {
  id: string; // Essential for fetching full profile
  // email: string; // No longer strictly needed here if full profile is fetched
  // name: string;  // No longer strictly needed here if full profile is fetched
  // role: Role;    // Will come from the full profile
  // permissions: UserPermissions; // Will come from the full profile
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
    const response = await api.post('/auth/login', credentials);
    console.log('Login successful:', response); 
    // Assuming backend returns the full AuthResponse with user object including role/permissions
    return response as AuthResponse; 
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

/**
 * **PLACEHOLDER**: Simulates verifying a token on the backend.
 * Updates to decode role and permissions from the token.
 * @param token The JWT token string.
 * @returns Promise resolving to the User object if token is valid and not expired.
 * @throws Error if token is invalid or expired.
 */
const verifyToken = async (token: string): Promise<User> => {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) {
      throw new Error("Invalid token format");
    }
    const decoded: JwtPayload = JSON.parse(atob(payloadBase64));

    // Basic check for expiration
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      throw new Error("Token expired");
    }

    // Check for essential ID from token
    if (!decoded.id) {
      throw new Error("Invalid token payload - missing user ID");
    }

    // Token seems valid enough to proceed, now fetch the full user profile
    // Assumes the token will be automatically included in the header by the api instance
    console.log(`[authService] Token initially validated for user ID: ${decoded.id}. Fetching full profile...`);
    const fullUserProfileResponse = await api.get('/auth/me'); // ASSUMED ENDPOINT
    
    if (!fullUserProfileResponse || typeof fullUserProfileResponse !== 'object') {
        throw new Error('Invalid user profile data received from /auth/me');
    }

    // Ensure the response looks like a User object (add more checks as needed)
    const userProfile = fullUserProfileResponse as User;
    if (!userProfile.id || !userProfile.email || !userProfile.name || !userProfile.role) {
        console.error("[authService] Fetched user profile is missing required fields:", userProfile);
        throw new Error('Fetched user profile is incomplete.');
    }

    console.log("[authService] Full user profile fetched successfully:", userProfile);
    return userProfile;

  } catch (error) {
    console.error("Token verification and profile fetch failed:", error);
    // If the error is from the api.get call, it might already be a rich error object
    // Otherwise, wrap it or re-throw as appropriate
    if (error instanceof Error && error.message.includes('Request failed')) { // Example check for axios error
        throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
    throw new Error("Invalid or expired token, or failed to fetch profile.");
  }
};

/**
 * Placeholder for logout functionality.
 * This might involve calling a backend logout endpoint or just clearing local state.
 */
const logout = async () => {
  // TODO: Implement logout logic 
  // e.g., await api.post('/auth/logout');
  // Clear stored token, reset user state
  console.log('User logged out (frontend)');
};

export const authService = {
  login,
  logout,
  verifyToken,
}; 