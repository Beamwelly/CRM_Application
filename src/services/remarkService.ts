import { api } from './api';
// Use CommunicationRecord type from shared types
import { HistoryEntry } from '../types'; 

// Define the payload for adding a remark (for internal use in this function)
interface AddRemarkInput {
    entityType: 'lead' | 'customer';
    entityId: string | number;
    remarkText: string;
}

/**
 * Adds a new remark (as a communication record) for a lead or customer.
 * @param input Object containing entityType, entityId, and remarkText.
 * @returns Promise resolving to the newly created remark (HistoryEntry).
 */
export const addRemark = async (input: AddRemarkInput): Promise<HistoryEntry> => {
    // Construct the payload required by the /api/communications endpoint
    const payload = {
        type: 'remark',
        notes: input.remarkText,
        leadId: input.entityType === 'lead' ? input.entityId : undefined,
        customerId: input.entityType === 'customer' ? input.entityId : undefined,
    };

    try {
        // Call the unified communications endpoint
        const newRemark = await api.post('/communications', payload);
        // Backend returns the full CommunicationRecord object, cast to HistoryEntry
        return newRemark as HistoryEntry;
    } catch (error) {
        console.error("Failed to add remark via API:", error);
        throw error;
    }
};

// Removed getRemarksForEntity function as it is now redundant. 