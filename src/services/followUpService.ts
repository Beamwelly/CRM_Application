import { api } from './api';
// Assuming ExtendedFollowUp is the one needed for frontend display context,
// and NewFollowUpData/FollowUpUpdateData are for API payloads.
import { ExtendedFollowUp as FollowUp } from '@/types/followUp';
import { NewFollowUpData } from '@/context/slices/followUpSlice';
import { FollowUpUpdateData } from '@/types/followUp';

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
export const addFollowUp = async (followUpData: NewFollowUpData): Promise<FollowUp> => {
  // Assuming currentUserId logic is handled by a context or passed differently if not available globally
  // For now, the backend handles creator assignment based on the authenticated user.
  const newFollowUp = await api.post<FollowUp>('/api/follow-ups', followUpData);
  return newFollowUp;
};

/**
 * Updates an existing follow-up on the backend.
 * @param followUpId The ID of the follow-up to update.
 * @param data The data for the update, e.g., { nextCallDate: string (ISO) }.
 * @returns Promise resolving to the updated FollowUp object.
 */
export const updateFollowUp = async (followUpId: string, data: FollowUpUpdateData): Promise<FollowUp> => {
  const updatedFollowUp = await api.put<FollowUp>(`/api/follow-ups/${followUpId}`, data);
  return updatedFollowUp;
};

/**
 * Deletes a follow-up via the backend API.
 * Assumes the backend has a protected endpoint DELETE /api/follow-ups/:id.
 * @param followUpId The ID of the follow-up to delete.
 * @returns Promise resolving when the deletion is successful.
 */
export const deleteFollowUp = async (followUpId: string): Promise<void> => {
  await api.delete(`/api/follow-ups/${followUpId}`); // Added /api prefix
};

// TODO: Add functions for getting follow-ups from the backend

export const followUpService = {
  addFollowUp,
  updateFollowUp,
  deleteFollowUp,
  // ... other functions
}; 