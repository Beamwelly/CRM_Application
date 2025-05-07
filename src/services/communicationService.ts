import { api } from './api';
import { CommunicationRecord } from '@/types';

// Type for data sent to the backend (matches backend Zod schema)
// Include recordingData (Base64 string), exclude id/date/createdBy/recordingUrl
type CommunicationApiData = Omit<CommunicationRecord, 'id' | 'date' | 'createdBy' | 'recordingUrl'> & { recordingData?: string };

/**
 * Adds a new communication record via the backend API.
 * Sends Base64 recording data if present.
 * @param recordData Data for the new record.
 * @returns Promise resolving to the created CommunicationRecord (with recordingUrl from backend).
 */
const addCommunicationRecord = async (recordData: CommunicationApiData): Promise<CommunicationRecord> => {
  try {
    const newRecord = await api.post('/communications', recordData);
    return newRecord as CommunicationRecord;
  } catch (error) {
    console.error('Failed to add communication record via API:', error);
    throw error;
  }
};

/**
 * Fetches *all* communication history accessible to the current user.
 * @returns Promise resolving to an array of CommunicationRecord objects.
 */
const getAllCommunicationHistory = async (): Promise<CommunicationRecord[]> => {
  try {
    // Calls the GET /api/communications endpoint (no entityId)
    const history = await api.get(`/communications`); 
    return history as CommunicationRecord[];
  } catch (error) {
    console.error(`Failed to fetch all communication history via API:`, error);
    throw error;
  }
};

/**
 * Fetches communication history for a specific entity (lead or customer).
 * @param entityId The ID of the lead or customer.
 * @returns Promise resolving to an array of CommunicationRecord objects.
 */
const getCommunicationHistoryForEntity = async (entityId: string | number): Promise<CommunicationRecord[]> => {
  try {
    const history = await api.get(`/communications/entity/${entityId}`);
    return history as CommunicationRecord[];
  } catch (error) {
    console.error(`Failed to fetch communication history for entity ${entityId} via API:`, error);
    throw error;
  }
};

// TODO: Add function to get *all* communication history if needed (respecting permissions)

export const communicationService = {
  addCommunicationRecord,
  getCommunicationHistoryForEntity,
  getAllCommunicationHistory,
}; 