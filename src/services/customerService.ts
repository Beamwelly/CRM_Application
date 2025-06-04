import { api } from './api';
import { Customer, RenewalHistory } from '@/types'; // Assuming types are in src/types

/**
 * Fetches all customers accessible to the current user from the backend API.
 * Assumes the backend has a protected endpoint like GET /api/customers.
 * The api helper automatically includes the auth token.
 * @param developerAdminFilterId Optional ID of admin to filter by (for developer role)
 * @returns Promise resolving to an array of Customer objects.
 */
const getAllCustomers = async (developerAdminFilterId?: string | null): Promise<Customer[]> => {
  try {
    const endpoint = developerAdminFilterId 
      ? `/api/customers?adminId=${developerAdminFilterId}` 
      : '/api/customers';
    console.log(`[Frontend customerService] Calling getAllCustomers with endpoint: ${endpoint}`);
    const customers = await api.get(endpoint); // Use the api helper
    return customers as Customer[]; // Add type assertion if needed
  } catch (error) {
    console.error('[Frontend customerService] Failed to fetch customers from API:', error);
    // Re-throw or handle error appropriately for the UI
    throw error; 
  }
};

/**
 * Creates a new customer via the backend API.
 * Assumes the backend has a protected endpoint like POST /api/customers.
 * The api helper automatically includes the auth token.
 * @param customerData Data for the new customer (should match backend expectation)
 * @returns Promise resolving to the newly created Customer object from the backend.
 */
const createCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'followUps' | 'renewalHistory' | 'communicationHistory'>): Promise<Customer> => {
  try {
    console.log('Creating customer with data:', customerData); // Debug log
    const response = await api.post('/api/customers', customerData);
    console.log('Customer creation response:', response); // Debug log
    
    if (!response) {
      throw new Error('No response received from server');
    }
    
    return response as Customer;
  } catch (error) {
    console.error('Failed to create customer via API:', error);
    throw error;
  }
};

/**
 * Updates an existing customer via the backend API.
 * Assumes the backend has a protected endpoint like PUT /api/customers/:id.
 * @param customerId The ID of the customer to update.
 * @param updateData An object containing the fields to update.
 * @returns Promise resolving to the updated Customer object from the backend.
 */
const updateCustomer = async (customerId: string | number, updateData: Partial<Omit<Customer, 'id' | 'createdAt' | 'followUps' | 'renewalHistory' | 'communicationHistory'>>): Promise<Customer> => {
  try {
    const updatedCustomer = await api.put(`/api/customers/${customerId}`, updateData);
    // Handle potential null return from api.put if backend returns 204
    // If backend *always* returns the updated customer, this check isn't strictly needed
    if (updatedCustomer === null) {
        // If backend returned 204, we might need to fetch the updated customer separately
        // or merge updateData locally (less ideal).
        // For now, let's assume backend returns the object or throws error.
        // Re-throwing might be suitable here depending on expected backend behavior.
        console.warn('Backend returned no content on update, full object might be stale.');
        // Returning a partially updated object based on input, might be incorrect
        return { id: String(customerId), ...updateData } as Customer; // This is potentially incomplete
    }
    return updatedCustomer as Customer; 
  } catch (error) {
    console.error(`Failed to update customer ${customerId} via API:`, error);
    throw error; 
  }
};

/**
 * Deletes a customer via the backend API.
 * Assumes the backend has a protected endpoint like DELETE /api/customers/:id.
 * @param customerId The ID of the customer to delete.
 * @returns Promise resolving when the deletion is successful (backend returns 204 No Content).
 */
const deleteCustomer = async (customerId: string | number): Promise<void> => {
  try {
    await api.delete(`/api/customers/${customerId}`); // Use api helper, expects 204 on success
  } catch (error) {
    console.error(`Failed to delete customer ${customerId} via API:`, error);
    // Re-throw or handle error appropriately for the UI
    throw error; 
  }
};

/**
 * Clears all customers via the backend API.
 * Requires appropriate admin permissions.
 * @returns Promise resolving when the deletion is successful.
 */
const clearAllCustomers = async (): Promise<void> => {
  try {
    await api.delete(`/api/admin/clear-data/customers`);
  } catch (error) {
    console.error(`Failed to clear all customers via API:`, error);
    throw error;
  }
};

/**
 * Adds a renewal history entry for a customer via the backend API.
 * Assumes the backend has POST /api/customers/:customerId/renewal-history
 * @param customerId The ID of the customer.
 * @param renewalEntry Data for the new renewal history (date field should be handled by backend or use NOW()).
 * @returns Promise resolving to the newly created RenewalHistory object.
 */
const addRenewalHistory = async (
  customerId: string | number,
  renewalEntry: Omit<RenewalHistory, 'id' | 'date'> // Input from frontend, id/date are set by backend
): Promise<RenewalHistory> => {
  try {
    // Send the relevant data. Ensure date formats match backend expectation if sending dates.
    // The backend route uses NOW() for the entry date, so we send amount, status, notes, nextRenewalDate.
    const newRenewal = await api.post(`/api/customers/${customerId}/renewal-history`, renewalEntry);
    return newRenewal as RenewalHistory;
  } catch (error) {
    console.error(`Failed to add renewal history for customer ${customerId} via API:`, error);
    throw error;
  }
};

// TODO: Add other customer-related API calls here as needed
// e.g., createCustomer, updateCustomer, deleteCustomer, addRenewal, addFollowUp

export const customerService = {
  getAllCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  clearAllCustomers,
  addRenewalHistory,
  // ... other functions
}; 