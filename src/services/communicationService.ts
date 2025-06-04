import { api } from './api';
import { CommunicationRecord } from '@/types';
import { AxiosResponse } from 'axios';
import { AuthUserInfo } from '@/types';

// Type for data sent to the backend (matches backend Zod schema)
type CommunicationApiData = {
  type: 'call' | 'meeting' | 'other';
  notes?: string;
  lead_id?: string;
  customer_id?: string;
  duration?: number;
  made_by?: string;
  recording_data?: string;
};

// Type for email data
interface EmailData {
  to: string;
  subject: string;
  message: string;
  leadId?: string | number;
  customerId?: string | number;
}

/**
 * Adds a new communication record via the backend API.
 * @param recordData Data for the communication record
 * @returns Promise resolving to the created CommunicationRecord
 */
const addCommunicationRecord = async (recordData: CommunicationApiData): Promise<CommunicationRecord> => {
  try {
    const response: AxiosResponse<CommunicationRecord> = await api.post('/api/communications', recordData);
    return response.data;
  } catch (error) {
    console.error('Failed to add communication record via API:', error);
    throw error;
  }
};

/**
 * Gets communication history for a specific entity (lead or customer).
 * @param entityId ID of the lead or customer
 * @param entityType Type of entity ('lead' or 'customer')
 * @returns Promise resolving to an array of CommunicationRecord
 */
const getCommunicationHistoryForEntity = async (
  entityId: string | number,
  entityType: 'lead' | 'customer'
): Promise<CommunicationRecord[]> => {
  try {
    const response: AxiosResponse<CommunicationRecord[]> = await api.get(
      `/api/communications/${entityType}/${entityId}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to get communication history via API:', error);
    throw error;
  }
};

/**
 * Gets all communication history (respecting user permissions).
 * @returns Promise resolving to an array of CommunicationRecord
 */
const getAllCommunicationHistory = async (): Promise<CommunicationRecord[]> => {
  try {
    const response: AxiosResponse<CommunicationRecord[]> = await api.get('/api/communications');
    return response.data;
  } catch (error) {
    console.error('Failed to get all communication history via API:', error);
    throw error;
  }
};

/**
 * Sends an email via the backend API.
 * @param emailData Data for the email including recipient, subject, and message
 * @returns Promise resolving to the created CommunicationRecord
 */
const sendEmail = async (emailData: EmailData): Promise<CommunicationRecord> => {
  throw new Error('Email integration is coming soon. This feature is not yet available.');
};

export const communicationService = {
  addCommunicationRecord,
  getCommunicationHistoryForEntity,
  getAllCommunicationHistory,
  sendEmail,
  getSentEmails: async (user: AuthUserInfo) => {
    throw new Error('Email integration is coming soon. This feature is not yet available.');
  }
}; 