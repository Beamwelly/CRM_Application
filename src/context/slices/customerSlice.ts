import { useState, useEffect, useCallback } from 'react';
import { Customer, RenewalHistory, PaymentType, FollowUp } from '@/types';
import { customerService } from '@/services/customerService';
import { followUpService } from '@/services/followUpService';

export interface CustomerState {
  customers: Customer[];
  isLoadingCustomers: boolean;
  errorLoadingCustomers: string | null;
}

export interface CustomerActions {
  addCustomer: (customerData: Omit<Customer, 'createdAt' | 'followUps' | 'id'>) => Promise<Customer>;
  updateCustomer: (updatedCustomer: Partial<Omit<Customer, 'id' | 'createdAt' | 'createdBy'>>) => Promise<void>; 
  deleteCustomer: (id: string | number) => Promise<void>; 
  getCustomersByAssignee: (userId: string) => Customer[];
  addCustomerFollowUp: (customerId: string | number, followUp: FollowUp) => Promise<void>;
  addRenewalHistory: (customerId: string | number, renewal: RenewalHistory) => Promise<void>;
  clearAllCustomers: () => Promise<void>; 
  fetchCustomers: (developerAdminFilterId?: string | null) => Promise<void>;
}

export const useCustomerSlice = (): CustomerState & CustomerActions => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(true);
  const [errorLoadingCustomers, setErrorLoadingCustomers] = useState<string | null>(null);
  
  const fetchCustomers = useCallback(async (developerAdminFilterId?: string | null) => {
    console.log(`[customerSlice] fetchCustomers called. developerAdminFilterId: ${developerAdminFilterId}`);
    setIsLoadingCustomers(true);
    setErrorLoadingCustomers(null);
    try {
      const fetchedCustomers = await customerService.getAllCustomers(developerAdminFilterId);
      console.log("[customerSlice] Raw fetchedCustomers from service:", fetchedCustomers);
      setCustomers(fetchedCustomers);
    } catch (error) { 
      console.error('[customerSlice] Error fetching customers in slice:', error);
      setErrorLoadingCustomers(error instanceof Error ? error.message : 'Failed to load customers');
      setCustomers([]);
    } finally {
      setIsLoadingCustomers(false);
    }
  }, []);
  
  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'followUps' | 'renewalHistory' | 'communicationHistory'>): Promise<Customer> => {
    try {
      const newCustomer = await customerService.createCustomer(customerData);
      console.log("Successfully created customer:", newCustomer);
      await fetchCustomers(); 
      return newCustomer;
    } catch (error) {
      console.error("Failed to add customer:", error);
      throw error;
    }
  };
  
  const updateCustomer = async (updatedCustomerData: Customer) => {
    try {
      const customerId = String(updatedCustomerData.id);

      // Explicitly pick fields that are actual columns in the 'customers' table and updatable.
      // This ensures we don't send derived fields or fields handled by other mechanisms.
      const payloadForApi: Partial<Omit<Customer, 'id' | 'createdAt' | 'createdBy' | 'followUps' | 'serviceTypes' | 'assignedToName' | 'assignedToEmail'>> = {
        // Populate with fields from updatedCustomerData that are valid for the backend's generic update
        name: updatedCustomerData.name,
        email: updatedCustomerData.email,
        mobile: updatedCustomerData.mobile,
        city: updatedCustomerData.city,
        status: updatedCustomerData.status,
        assignedTo: updatedCustomerData.assignedTo, // This should be just the ID string
        startDate: updatedCustomerData.startDate,
        leadId: updatedCustomerData.leadId,
        paymentType: updatedCustomerData.paymentType,
        paymentStatus: updatedCustomerData.paymentStatus,
        aum: updatedCustomerData.aum, // Will be parsed below
        nextRenewal: updatedCustomerData.nextRenewal,
        nextReview: updatedCustomerData.nextReview,
        reviewRemarks: updatedCustomerData.reviewRemarks,
        batchNo: updatedCustomerData.batchNo,
        dob: updatedCustomerData.dob,
        address: updatedCustomerData.address,
        company: updatedCustomerData.company,
        engagementFlags: updatedCustomerData.engagementFlags,
        // Do NOT include: serviceTypes (handled by backend separately if part of payload),
        // followUps (should be handled by a dedicated follow-up API),
        // assignedToName, assignedToEmail (these are derived data for display)
        // id, createdAt, createdBy (typically not updated like this)
      };

      if (payloadForApi.aum !== undefined && payloadForApi.aum !== null) {
        const aumValue = parseFloat(String(payloadForApi.aum));
        payloadForApi.aum = isNaN(aumValue) ? null : aumValue; 
      }
      // Add any other necessary type conversions for other fields (e.g., dates to string if backend expects ISO strings)
      // However, the backend service seems to handle new Date() for dates already.

      // If you intend to update serviceTypes via this call, they should be added to payloadForApi
      // and the backend updateCustomer must be prepared to handle a serviceTypes array.
      // For the current problem, we assume serviceTypes are NOT being updated by this specific action.
      // const payloadWithServices = { ...payloadForApi, serviceTypes: updatedCustomerData.serviceTypes };

      const returnedCustomer = await customerService.updateCustomer(customerId, payloadForApi);
      console.log("Successfully updated customer via service:", returnedCustomer);

      setCustomers(prevCustomers => 
        prevCustomers.map(customer => {
          if (String(customer.id) === customerId) {
            // Merge, but ensure serviceTypes is always an array
            return {
              ...customer,
              ...returnedCustomer,
              serviceTypes: returnedCustomer.serviceTypes || [] // Explicitly default to [] if null/undefined
            };
          }
          return customer;
        })
      );
      // Optionally, could re-fetch the entire list after update if needed
      // await fetchCustomers(); 
    } catch (error) {
      console.error("Failed to update customer in slice:", error);
      // TODO: Set an error state for the UI
    }
  };
  
  const deleteCustomer = async (id: string | number) => {
    const customerId = String(id); // Ensure ID is string
    try {
      await customerService.deleteCustomer(customerId);
      console.log("Successfully deleted customer:", customerId);
      // Update local state
      setCustomers(prevCustomers => prevCustomers.filter(customer => String(customer.id) !== customerId));
    } catch (error) {
      console.error(`Failed to delete customer ${customerId}:`, error);
      // TODO: Set an error state for the UI
    }
  };
  
  const getCustomersByAssignee = (userId: string): Customer[] => {
    return customers.filter(customer => customer.assignedTo === userId);
  };
  
  const addCustomerFollowUp = async (customerId: string | number, followUp: FollowUp) => {
    const { id, date, createdBy, leadId, ...apiData } = followUp;
    const customerIdStr = String(customerId);

    try {
      const newFollowUp = await followUpService.addFollowUp({ 
        ...apiData, // notes, nextCallDate
        nextCallDate: typeof apiData.nextCallDate === 'string' ? apiData.nextCallDate : apiData.nextCallDate.toISOString(),
        customerId: customerIdStr, // Ensure customerId is included
      }); 

      setCustomers(prev => prev.map(cust => 
        String(cust.id) === customerIdStr
          ? { ...cust, followUps: [...(cust.followUps || []), newFollowUp] }
          : cust
      ));
      // Optional: Show success toast
    } catch (error) {
      console.error(`Failed to add follow-up for customer ${customerIdStr}:`, error);
      // Optional: Show error toast
    }
  };
  
  const addRenewalHistory = async (customerId: string | number, renewal: RenewalHistory) => {
    // console.log("TODO: Call backend API to add renewal history:", customerId, renewal);
    const customerIdStr = String(customerId);
    try {
      // Prepare data for API: exclude id and potentially the main 'date' if backend sets it
      const { id, date, ...renewalDataForApi } = renewal;
      const newRenewalEntry = await customerService.addRenewalHistory(customerIdStr, renewalDataForApi);
      console.log(`[customerSlice] Renewal history added for ${customerIdStr}:`, newRenewalEntry);

      // Update local state
      setCustomers(prev => prev.map(cust => {
        if (String(cust.id) === customerIdStr) {
          const updatedHistory = [...(cust.renewalHistory || []), newRenewalEntry];
          // Sort history by date descending (most recent first) for consistency
          updatedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return { 
            ...cust, 
            renewalHistory: updatedHistory, 
            // Optionally update the main nextRenewal date on the customer based on the new entry
            // This mirrors what RenewalManagementDialog tries to do via updateCustomer
            // However, it's better handled here for state consistency.
            nextRenewal: newRenewalEntry.nextRenewalDate 
          };
        } else {
          return cust;
        }
      }));
      // Note: RenewalManagementDialog also calls updateCustomer separately to update the main customer.nextRenewal.
      // This might be redundant now, or could cause race conditions. Consider removing the updateCustomer call
      // from RenewalManagementDialog if this state update is sufficient.
    } catch (error) {
      console.error(`Failed to add renewal history for customer ${customerIdStr}:`, error);
      throw error; // Re-throw for the component to handle (e.g., show error toast)
    }
  };
  
  const clearAllCustomers = async () => {
    // console.log('TODO: Call backend API to clear all customers');
     try {
      await customerService.clearAllCustomers(); // Call the service
      setCustomers([]); // Clear local state on success
      // Optional: Show success toast? (Maybe in component after await)
    } catch (error) {
      console.error('Failed to clear all customers:', error);
      // Optional: Show error toast? (Maybe in component after await)
      throw error; // Re-throw the error so the component can catch it
    }
  };
  
  return {
    customers,
    isLoadingCustomers,
    errorLoadingCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomersByAssignee,
    addCustomerFollowUp,
    addRenewalHistory,
    clearAllCustomers,
    fetchCustomers
  };
};
