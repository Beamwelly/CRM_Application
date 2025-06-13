import { api } from './api';
import { User, UserPermissions } from '@/types'; // Assuming types are in src/types

// Define the expected shape for user creation data (matching backend expectations)
// Exclude fields generated by backend (id, createdAt) but include password
type UserCreationPayload = Omit<User, 'id' | 'createdAt'> & { password?: string };

// --- Define Payload Types --- 
// Payload for creating an admin (name, email, password, optional limit)
// This type definition is no longer accurate for the function input
// type AddAdminPayload = {
//   name: string;
//   email: string;
//   password?: string; // Optional if backend handles default/invite
//   employeeCreationLimit?: number | null;
// }

/**
 * Fetches all users from the backend API.
 * Assumes the backend has an endpoint like GET /api/users.
 * @returns Promise resolving to an array of User objects.
 */
const getAllUsers = async (): Promise<User[]> => {
  try {
    console.log('Making API request to fetch users...');
    const response = await api.get<User[]>('/api/users', {
      headers: {
        'X-User-Permissions': JSON.stringify({
          role: localStorage.getItem('userRole'),
          permissions: JSON.parse(localStorage.getItem('userPermissions') || '{}')
        })
      }
    });
    console.log('Raw API response:', response);
    
    if (!response) {
      console.error('No response received from API');
      return [];
    }
    
    if (!Array.isArray(response)) {
      console.error('Response is not an array:', response);
      return [];
    }
    
    console.log('Users by role:', {
      admins: response.filter(u => u.role === 'admin').length,
      developers: response.filter(u => u.role === 'developer').length,
      employees: response.filter(u => u.role === 'employee').length
    });
    
    return response;
  } catch (error) {
    console.error('Failed to fetch users from API:', error);
    throw error;
  }
};

/**
 * Creates a new user via the backend API.
 * @param userData The data for the new user.
 * @returns Promise resolving to the newly created User object.
 */
const createUser = async (userData: UserCreationPayload): Promise<User> => {
  try {
    const newUser = await api.post('/api/users', userData);
    return newUser as User;
  } catch (error) {
    console.error('Failed to create user via API:', error);
    throw error;
  }
};

/**
 * Updates the permissions for a specific user via the backend API.
 * @param userId The ID of the user to update.
 * @param permissions The new permissions object.
 * @returns Promise resolving to the updated User object.
 */
const updateUserPermissions = async (userId: string, permissions: UserPermissions): Promise<User> => {
  try {
    const updatedUser = await api.put(`/api/users/${userId}/permissions`, { permissions });
    return updatedUser as User;
  } catch (error) {
    console.error(`Failed to update permissions for user ${userId} via API:`, error);
    throw error;
  }
};

/**
 * Deletes a user via the backend API.
 * @param userId The ID of the user to delete.
 * @returns Promise resolving when the deletion is successful.
 */
const deleteUser = async (userId: string): Promise<void> => {
  try {
    await api.delete(`/api/users/${userId}`);
  } catch (error) {
    console.error(`Failed to delete user ${userId} via API:`, error);
    throw error;
  }
};

/**
 * Adds a new admin user, potentially including a logo file.
 * @param adminData FormData containing admin details and optional logo file.
 * @returns Promise resolving to the newly created Admin User object.
 */
const addAdmin = async (adminData: FormData): Promise<User> => {
  try {
    // Correct endpoint is /api/admin/create-admin as per backend route setup
    const newAdmin = await api.post('/api/admin/create-admin', adminData); 
    // api.post with FormData should automatically set Content-Type: multipart/form-data
    return newAdmin as User;
  } catch (error) {
    console.error('Failed to add admin via API:', error);
    throw error;
  }
};

// Add other user-related API calls here as needed
// e.g., getUserById, createUser, updateUser, deleteUser

export const userService = {
  getAllUsers,
  createUser,
  addAdmin,
  updateUserPermissions,
  deleteUser,
  // ... other functions
};
