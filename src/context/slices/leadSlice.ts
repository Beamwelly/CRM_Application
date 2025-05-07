import { useState, useEffect, useCallback } from 'react';
import { Lead, FollowUp } from '@/types';
import { leadService } from '@/services/leadService';
import { followUpService } from '@/services/followUpService';

export interface LeadState {
  leads: Lead[];
  isLoadingLeads: boolean;
  errorLoadingLeads: string | null;
}

export interface LeadActions {
  addLead: (leadData: Omit<Lead, 'createdAt' | 'followUps' | 'id'>) => Promise<void>;
  updateLead: (updatedLead: Lead) => Promise<void>;
  updateLeadLocalState: (updatedLead: Lead) => void;
  deleteLead: (id: string | number) => Promise<void>;
  assignLead: (leadId: string | number, userId: string | null) => Promise<void>;
  getLeadsByAssignee: (userId: string) => Lead[];
  addLeadFollowUp: (leadId: string | number, followUp: FollowUp) => Promise<void>;
  clearAllLeads: () => Promise<void>;
  fetchLeads: () => Promise<void>;
}

export const useLeadSlice = (): LeadState & LeadActions => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState<boolean>(true);
  const [errorLoadingLeads, setErrorLoadingLeads] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    console.log("Attempting to fetch leads...");
    setIsLoadingLeads(true);
    setErrorLoadingLeads(null);
    try {
      const fetchedLeads = await leadService.getAllLeads();
      console.log("Fetched leads:", fetchedLeads);
      setLeads(fetchedLeads);
    } catch (error) { 
      console.error('Error fetching leads in slice:', error);
      setErrorLoadingLeads(error instanceof Error ? error.message : 'Failed to load leads');
      setLeads([]);
    } finally {
      setIsLoadingLeads(false);
    }
  }, []);

  const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'followUps' | 'communicationHistory'>) => {
    try {
      const newLead = await leadService.createLead(leadData);
      console.log("Successfully created lead:", newLead);
      await fetchLeads();
    } catch (error) {
      console.error("Failed to add lead:", error);
    }
  };

  const updateLead = async (updatedLead: Lead) => {
    try {
      const { id, ...updateData } = updatedLead;
      const leadId = String(id);

      const returnedLead = await leadService.updateLead(leadId, updateData);
      console.log("Successfully updated lead:", returnedLead);
      
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          String(lead.id) === leadId ? { ...lead, ...returnedLead } : lead
        )
      );
    } catch (error) {
      console.error("Failed to update lead:", error);
    }
  };

  const updateLeadLocalState = (updatedLead: Lead): void => {
    const leadId = String(updatedLead.id);
    setLeads(prevLeads => 
      prevLeads.map(lead => 
        String(lead.id) === leadId ? updatedLead : lead
      )
    );
  };

  const deleteLead = async (id: string | number) => {
    const leadId = String(id);
    try {
      await leadService.deleteLead(leadId);
      console.log("Successfully deleted lead:", leadId);
      setLeads(prevLeads => prevLeads.filter(lead => String(lead.id) !== leadId));
    } catch (error) {
      console.error(`Failed to delete lead ${leadId}:`, error);
    }
  };

  const assignLead = async (leadId: string | number, userId: string | null) => {
    const leadIdStr = String(leadId);
    try {
      const updatedLead = await leadService.assignLead(leadIdStr, userId);
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          String(lead.id) === leadIdStr ? { ...lead, ...updatedLead } : lead
        )
      );
    } catch (error) {
       console.error(`Failed to assign lead ${leadIdStr} to user ${userId}:`, error);
    }
  };

  const getLeadsByAssignee = (userId: string): Lead[] => {
    return leads.filter(lead => lead.assignedTo === userId);
  };

  const addLeadFollowUp = async (leadId: string | number, followUp: FollowUp): Promise<void> => {
    const { id, date, createdBy, customerId, ...apiData } = followUp;
    const leadIdStr = String(leadId);

    try {
      const newFollowUp = await followUpService.addFollowUp({ 
        ...apiData,
        nextCallDate: typeof apiData.nextCallDate === 'string' ? apiData.nextCallDate : apiData.nextCallDate.toISOString(),
        leadId: leadIdStr,
      }); 

      setLeads(prev => prev.map(lead => 
        String(lead.id) === leadIdStr
          ? { ...lead, followUps: [...(lead.followUps || []), newFollowUp] }
          : lead
      ));
    } catch (error) {
      console.error(`Failed to add follow-up for lead ${leadIdStr}:`, error);
    }
  };

  const clearAllLeads = async () => {
    // console.log('TODO: Call backend API to clear all leads');
    try {
      await leadService.clearAllLeads(); // Call the service
      setLeads([]); // Clear local state on success
      // Optional: Show success toast? (Maybe in component after await)
    } catch (error) {
      console.error('Failed to clear all leads:', error);
      // Optional: Show error toast? (Maybe in component after await)
      throw error; // Re-throw the error so the component can catch it
    }
  };

  return {
    leads,
    isLoadingLeads,
    errorLoadingLeads,
    addLead,
    updateLead,
    updateLeadLocalState,
    deleteLead,
    assignLead,
    getLeadsByAssignee,
    addLeadFollowUp,
    clearAllLeads,
    fetchLeads
  };
};
