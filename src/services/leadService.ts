import { api } from './api';
import { Lead } from '@/types'; // Assuming types are in src/types

/**
 * Fetches all leads accessible to the current user from the backend API.
 * Assumes the backend has a protected endpoint like GET /api/leads.
 * The api helper automatically includes the auth token.
 * @returns Promise resolving to an array of Lead objects.
 */
const getAllLeads = async (): Promise<Lead[]> => {
  try {
    const leads = await api.get('/api/leads'); // Use the api helper
    return leads as Lead[]; // Add type assertion if needed
  } catch (error) {
    console.error('Failed to fetch leads from API:', error);
    // Re-throw or handle error appropriately for the UI
    throw error; 
  }
};

/**
 * Creates a new lead via the backend API.
 * Assumes the backend has a protected endpoint like POST /api/leads.
 * The api helper automatically includes the auth token.
 * @param leadData Data for the new lead (should match backend expectation, likely excluding id, createdAt, etc.)
 * @returns Promise resolving to the newly created Lead object from the backend.
 */
const createLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'followUps' | 'communicationHistory'>): Promise<Lead> => {
  try {
    // The api.post helper sends the auth token
    const newLead = await api.post('/api/leads', leadData); 
    return newLead as Lead; // Backend should return the created lead object
  } catch (error) {
    console.error('Failed to create lead via API:', error);
    // Re-throw or handle error appropriately for the UI
    throw error; 
  }
};

/**
 * Updates an existing lead via the backend API.
 * Assumes the backend has a protected endpoint like PUT /api/leads/:id.
 * @param leadId The ID of the lead to update.
 * @param updateData An object containing the fields to update.
 * @returns Promise resolving to the updated Lead object from the backend.
 */
const updateLead = async (leadId: string | number, updateData: Partial<Omit<Lead, 'id' | 'createdAt' | 'followUps' | 'communicationHistory'>>): Promise<Lead> => {
  try {
    // The api helper needs a put method similar to get/post
    // Assuming api.put exists or will be added to api.ts
    const updatedLead = await api.put(`/api/leads/${leadId}`, updateData);
    return updatedLead as Lead; // Backend should return the updated lead
  } catch (error) {
    console.error(`Failed to update lead ${leadId} via API:`, error);
    throw error; 
  }
};

/**
 * Deletes a lead via the backend API.
 * Assumes the backend has a protected endpoint like DELETE /api/leads/:id.
 * @param leadId The ID of the lead to delete.
 * @returns Promise resolving when the deletion is successful (backend returns 204 No Content).
 */
const deleteLead = async (leadId: string | number): Promise<void> => {
  try {
    await api.delete(`/api/leads/${leadId}`); 
  } catch (error) {
    console.error(`Failed to delete lead ${leadId} via API:`, error);
    // Re-throw or handle error appropriately for the UI
    throw error; 
  }
};

/**
 * Assigns a lead to a user via the backend API.
 * @param leadId The ID of the lead to assign.
 * @param userId The ID of the user to assign to (or null to unassign).
 * @returns Promise resolving to the updated Lead object.
 */
const assignLead = async (leadId: string, userId: string | null): Promise<Lead> => {
    try {
      const updatedLead = await api.put(`/api/leads/${leadId}/assign`, { userId });
      return updatedLead as Lead;
    } catch (error) {
      console.error(`Failed to assign lead ${leadId} to user ${userId} via API:`, error);
      throw error;
    }
};

/**
 * Clears all leads via the backend API.
 * Requires appropriate admin permissions.
 * @returns Promise resolving when the deletion is successful.
 */
const clearAllLeads = async (): Promise<void> => {
  try {
    await api.delete(`/api/admin/clear-data/leads`);
    // No return value needed, success indicated by lack of error
  } catch (error) {
    console.error(`Failed to clear all leads via API:`, error);
    throw error;
  }
};

// TODO: Add other lead-related API calls here as needed
// e.g., getLeadById, addFollowUp

export const leadService = {
  getAllLeads,
  createLead,
  updateLead,
  deleteLead,
  assignLead,
  clearAllLeads,
  // ... other functions
};

