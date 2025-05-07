import { api } from './api';
import { FollowUp } from '@/types'; // Assuming shared types

// Type for data sent to the API (matches backend validation)
// Exclude id, date, createdBy as these are handled by backend/context
// nextCallDate will be an ISO string
interface FollowUpApiData {
  notes: string;
  nextCallDate: string; // ISO string
  leadId?: string;
  customerId?: string;
}

/**
 * Adds a new follow-up via the backend API.
 * Assumes the backend has a protected endpoint POST /api/follow-ups.
 * The api helper automatically includes the auth token.
 * @param followUpData Data for the new follow-up (notes, nextCallDate, leadId OR customerId).
 * @returns Promise resolving to the newly created FollowUp object from the backend.
 */
const addFollowUp = async (followUpData: FollowUpApiData): Promise<FollowUp> => {
  try {
    // The api.post helper sends the auth token
    const newFollowUp = await api.post('/follow-ups', followUpData); 
    return newFollowUp as FollowUp; // Backend should return the created follow-up object
  } catch (error) {
    console.error('Failed to add follow-up via API:', error);
    // Re-throw or handle error appropriately for the UI
    throw error; 
  }
};

/**
 * Deletes a follow-up via the backend API.
 * Assumes the backend has a protected endpoint DELETE /api/follow-ups/:id.
 * @param followUpId The ID of the follow-up to delete.
 * @returns Promise resolving when the deletion is successful.
 */
const deleteFollowUp = async (followUpId: string): Promise<void> => {
  try {
    // The api helper should have a delete method similar to get/post/put
    // Assuming api.delete exists or will be added to api.ts
    await api.delete(`/follow-ups/${followUpId}`);
  } catch (error) {
    console.error(`Failed to delete follow-up ${followUpId} via API:`, error);
    // Re-throw or handle error appropriately for the UI
    throw error;
  }
};

// TODO: Add functions for getting follow-ups from the backend

export const followUpService = {
  addFollowUp,
  deleteFollowUp,
  // ... other functions
}; 