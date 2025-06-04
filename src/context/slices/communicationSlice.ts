import { useState, useEffect, useCallback } from 'react';
import { Lead, Customer, User, HistoryEntry } from '@/types';
import { communicationService } from '@/services/communicationService';

// Define the type for data passed to addCommunication (matches service input)
// Includes recordingData (base64), excludes id/date/createdBy
type AddCommunicationInput = Omit<HistoryEntry, 'id' | 'date' | 'createdBy' | 'recordingUrl'> & { recordingData?: string };

// Add the missing CommunicationState interface
export type CommunicationState = {
  communicationHistory: HistoryEntry[];
  isLoadingHistory: boolean;
  errorLoadingHistory: string | null;
}

export interface CommunicationActions {
  addCommunication: (record: AddCommunicationInput) => Promise<HistoryEntry>;
  getCommunicationHistoryForEntity: (entityId: string | number) => Promise<HistoryEntry[]>;
  getAllCommunicationHistory: () => Promise<HistoryEntry[]>;
  fetchCommunicationHistory: (entityId?: string | number) => Promise<void>;
  isLoadingHistory: boolean;
  errorLoadingHistory: string | null;
}

export const useCommunicationSlice = (
  leads: Lead[], 
  customers: Customer[],
  users: User[],
  updateLeadInternal: (lead: Lead) => Promise<void>,
  updateCustomerInternal: (customer: Customer) => Promise<void>
): CommunicationActions => {
  
  const [communicationHistory, setCommunicationHistory] = useState<HistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [errorLoadingHistory, setErrorLoadingHistory] = useState<string | null>(null);

  const fetchCommunicationHistory = useCallback(async (entityId?: string | number) => {
    console.log(`Attempting to fetch communication history ${entityId ? 'for entity ' + entityId : 'for all accessible entities'}...`);
    setIsLoadingHistory(true);
    setErrorLoadingHistory(null);
    try {
      let fetchedHistory: HistoryEntry[];
      if (entityId) {
        fetchedHistory = await communicationService.getCommunicationHistoryForEntity(entityId);
      } else {
        // Fetch all accessible history using the new service function
        fetchedHistory = await communicationService.getAllCommunicationHistory();
      }
      console.log("Fetched communication history:", fetchedHistory);
      
      // Update state handling:
      setCommunicationHistory(currentHistory => {
        if (entityId) {
          // Fetching for a specific entity: Replace only that entity's records
          const otherHistory = currentHistory.filter(r => String(r.leadId || r.customerId) !== String(entityId));
          return [...otherHistory, ...fetchedHistory];
        } else {
          // Fetching all: Replace the entire history state
          return fetchedHistory;
        }
      });
    } catch (error) {
      console.error("Error fetching communication history:", error);
      setErrorLoadingHistory(error instanceof Error ? error.message : "Failed to load history");
      // Set history to empty only if fetching all failed
      if (!entityId) {
        setCommunicationHistory([]); 
      }
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);
  
  const addCommunication = async (recordData: AddCommunicationInput): Promise<HistoryEntry> => {
    try {
      console.log('Calling communicationService.addCommunicationRecord', recordData);
      // createdBy will be handled by the backend using the auth token
      const newCommunication = await communicationService.addCommunicationRecord(recordData);
      
      // Add the returned record (which includes id, date, recordingUrl) to local state
      setCommunicationHistory(currentHistory => {
        const history = Array.isArray(currentHistory) ? currentHistory : [];
        return [...history, newCommunication];
      });
      return newCommunication;
    } catch (error) {
      console.error('Failed to add communication record via service:', error);
      throw error; // Re-throw for the component to handle (e.g., show toast)
    }
  };
  
  const getCommunicationHistoryForEntity = async (entityId: string | number): Promise<HistoryEntry[]> => {
    return communicationHistory.filter(
      history => 
        (history.leadId && String(history.leadId) === String(entityId)) || 
        (history.customerId && String(history.customerId) === String(entityId))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };
  
  const getAllCommunicationHistory = async (): Promise<HistoryEntry[]> => {
    try {
      const response = await communicationService.getAllCommunicationHistory();
      setCommunicationHistory(response);
      return response;
    } catch (error) {
      console.error("Error fetching all communication history:", error);
      throw error;
    }
  };
  
  return {
    addCommunication,
    getCommunicationHistoryForEntity,
    getAllCommunicationHistory,
    fetchCommunicationHistory,
    isLoadingHistory,
    errorLoadingHistory
  };
};
