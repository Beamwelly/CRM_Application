import { api } from './api';
import { ParsedRow } from '@/utils/importHelpers'; // Re-use ParsedRow type if applicable

// Define type for errors returned from backend
interface BulkUploadError {
  rowData?: ParsedRow; // The data that failed (optional)
  error: string; // The error message
}

// Type for the response from the backend bulk endpoints
interface BulkUploadResponse {
  message: string;
  insertedCount: number;
  errors: BulkUploadError[]; // Use the specific type
}

/**
 * Uploads an array of lead data to the backend bulk endpoint.
 * @param leadsData Array of parsed and validated lead objects.
 * @returns Promise resolving to the backend response.
 */
const uploadLeads = async (leadsData: ParsedRow[]): Promise<BulkUploadResponse> => {
  try {
    const response = await api.post('/bulk/leads', leadsData);
    return response as BulkUploadResponse;
  } catch (error) {
    console.error('Failed to bulk upload leads via API:', error);
    throw error;
  }
};

/**
 * Uploads an array of customer data to the backend bulk endpoint.
 * @param customersData Array of parsed and validated customer objects.
 * @returns Promise resolving to the backend response.
 */
const uploadCustomers = async (customersData: ParsedRow[]): Promise<BulkUploadResponse> => {
  try {
    const response = await api.post('/bulk/customers', customersData);
    return response as BulkUploadResponse;
  } catch (error) {
    console.error('Failed to bulk upload customers via API:', error);
    throw error;
  }
};

export const bulkService = {
  uploadLeads,
  uploadCustomers,
}; 