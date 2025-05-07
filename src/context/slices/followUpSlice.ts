import { Lead, Customer, FollowUp, ServiceType, User } from '@/types';
import { followUpService } from '@/services/followUpService'; // Import the service
import { ExtendedFollowUp } from '@/types/followUp'; // Import the extended type
import { useAuthSlice } from './authSlice';

// Type for the data passed from the dialog/form
export interface NewFollowUpData {
  notes: string;
  nextCallDate: string; // Expected as ISO string
}

// Add FollowUpState interface that was missing
export type FollowUpState = Record<string, never>; // Empty state type

export interface FollowUpActions {
  // Match CRMContextTypes definition
  addFollowUp: (entityType: 'lead' | 'customer', entityId: string | number, followUp: NewFollowUpData) => Promise<void>; 
  // Match CRMContextTypes definition for return type
  getPendingFollowUps: (userId?: string) => ExtendedFollowUp[]; 
  markFollowUpAsDone: (followUpId: string, entityType: 'lead' | 'customer', entityId: string | number) => Promise<void>;
}

// Need fetchLeads/fetchCustomers to refresh data after add
// These should ideally come from the respective slices or the main context
interface FollowUpSliceDependencies {
    leads: Lead[];
    customers: Customer[];
    addLeadFollowUp?: (leadId: string, followUpData: NewFollowUpData) => Promise<void>;
    addCustomerFollowUp?: (customerId: string, followUpData: NewFollowUpData) => Promise<void>;
    updateLeadInState: (updatedLead: Lead) => void;
    updateCustomerInState: (updatedCustomer: Customer) => void;
}

export const useFollowUpSlice = (dependencies: FollowUpSliceDependencies): FollowUpActions => {
  const { leads, customers, addLeadFollowUp, addCustomerFollowUp, updateLeadInState, updateCustomerInState } = dependencies;
  
  const addFollowUp = async (entityType: 'lead' | 'customer', entityId: string | number, followUpData: NewFollowUpData) => {
    try {
        console.log(`[followUpSlice] Adding follow-up for ${entityType} ${entityId}:`, followUpData);
        const payload = {
            ...followUpData, // notes (string), nextCallDate (string)
            leadId: entityType === 'lead' ? String(entityId) : undefined,
            customerId: entityType === 'customer' ? String(entityId) : undefined,
        };

        // Call the actual backend service
        const newFollowUp = await followUpService.addFollowUp(payload);
        console.log("[followUpSlice] Follow-up added via service:", newFollowUp);

        // Call the appropriate function based on entity type
        if (entityType === 'lead' && addLeadFollowUp) {
            await addLeadFollowUp(String(entityId), followUpData);
        } else if (entityType === 'customer' && addCustomerFollowUp) {
            await addCustomerFollowUp(String(entityId), followUpData);
        }

    } catch (error) {
        console.error(`[followUpSlice] Failed to add follow-up for ${entityType} ${entityId}:`, error);
        // Re-throw the error so the calling component can handle it (e.g., show toast)
        throw error; 
    }
  };
  
  // Update to return ExtendedFollowUp[] 
  const getPendingFollowUps = (userId?: string): ExtendedFollowUp[] => {
    const pendingResults: ExtendedFollowUp[] = [];
    
    // Get follow-ups from leads
    (leads || []).forEach(lead => { // Add safety check for leads
      if (!userId || lead.assignedTo === userId) {
        (lead.followUps || []).forEach(followUp => { // Add safety check for followUps
          // Convert to ExtendedFollowUp
          const extendedFollowUp: ExtendedFollowUp = {
            ...followUp,
            leadName: lead.name,
            entityType: 'lead',
            entityId: lead.id
          };
          pendingResults.push(extendedFollowUp);
        });
      }
    });
    
    // Get follow-ups from customers
    (customers || []).forEach(customer => { // Add safety check for customers
      if (!userId || customer.assignedTo === userId) {
        (customer.followUps || []).forEach(followUp => { // Add safety check for followUps
          // Convert to ExtendedFollowUp
          const extendedFollowUp: ExtendedFollowUp = {
            ...followUp,
            customerName: customer.name,
            entityType: 'customer',
            entityId: customer.id
          };
          pendingResults.push(extendedFollowUp);
        });
      }
    });
    
    // Sort by date (ensure dates are Date objects)
    pendingResults.sort((a, b) => {
      const dateA = typeof a.nextCallDate === 'string' ? new Date(a.nextCallDate) : a.nextCallDate;
      const dateB = typeof b.nextCallDate === 'string' ? new Date(b.nextCallDate) : b.nextCallDate;
      // Handle potential invalid dates
      if (!dateA || isNaN(dateA.getTime()) || !dateB || isNaN(dateB.getTime())) return 0; 
      return dateA.getTime() - dateB.getTime();
    });
    
    return pendingResults;
  };
  
  const markFollowUpAsDone = async (followUpId: string, entityType: 'lead' | 'customer', entityId: string | number) => {
    try {
      await followUpService.deleteFollowUp(followUpId);
      console.log(`[followUpSlice] Follow-up ${followUpId} marked as done (deleted).`);

      if (entityType === 'lead') {
        const lead = leads.find(l => String(l.id) === String(entityId));
        if (lead) {
          const updatedFollowUps = (lead.followUps || []).filter(f => f.id !== followUpId);
          updateLeadInState({ ...lead, followUps: updatedFollowUps });
        }
      } else if (entityType === 'customer') {
        const customer = customers.find(c => String(c.id) === String(entityId));
        if (customer) {
          const updatedFollowUps = (customer.followUps || []).filter(f => f.id !== followUpId);
          updateCustomerInState({ ...customer, followUps: updatedFollowUps });
        }
      }
    } catch (error) {
      console.error(`[followUpSlice] Failed to mark follow-up ${followUpId} as done:`, error);
      throw error; // Re-throw for UI to handle
    }
  };
  
  return {
    addFollowUp,
    getPendingFollowUps,
    markFollowUpAsDone,
  };
};
