import React, { ReactNode, useCallback } from 'react';
// Remove the conflicting import and use our own interface
// import { CRMContextType } from './CRMContextTypes';
import { leads as initialLeads, customers as initialCustomers } from '@/data/dummyData';
import { useEffect, useState } from 'react';
import { userService } from '@/services/userService';
import { User, UserPermissions, ServiceType, Lead, Customer, FollowUp } from '@/types';
import { CRMContext } from './hooks';
import { addRemark as addRemarkService } from '@/services/remarkService';

// Define UserCreationPayload locally or import from userService if shared
type UserCreationPayload = Omit<User, 'id' | 'createdAt'> & { password?: string };

// Import slices
import { useAuthSlice, AuthActions, AuthState } from './slices/authSlice';
import { useLeadSlice, LeadState, LeadActions } from './slices/leadSlice';
import { useCustomerSlice, CustomerState, CustomerActions } from './slices/customerSlice';
import { useFollowUpSlice, FollowUpState, FollowUpActions } from './slices/followUpSlice';
import { ConversionActions, ConversionState, useConversionSlice } from './slices/conversionSlice';
import { useCommunicationSlice, CommunicationState, CommunicationActions } from './slices/communicationSlice';
import { NewFollowUpData } from './slices/followUpSlice';

// Define our own CRMContextType that matches all the used types in this file
export interface CRMContextType {
  // Auth-related
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  currentUser: User | null;
  login: AuthActions['login'];
  logout: AuthActions['logout'];
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  hasServiceTypeAccess: (serviceType: ServiceType) => boolean;
  
  // Lead-related
  leads: Lead[];
  isLoadingLeads: boolean;
  errorLoadingLeads: string | null;
  addLead: LeadActions['addLead'];
  updateLead: LeadActions['updateLead'];
  deleteLead: LeadActions['deleteLead'];
  assignLead: LeadActions['assignLead'];
  clearAllLeads: LeadActions['clearAllLeads'];
  fetchLeads: LeadActions['fetchLeads'];
  getLeadsByAssignee: LeadActions['getLeadsByAssignee'];
  
  // Customer-related
  customers: Customer[];
  isLoadingCustomers: boolean;
  errorLoadingCustomers: string | null;
  addCustomer: CustomerActions['addCustomer'];
  updateCustomer: CustomerActions['updateCustomer'];
  deleteCustomer: CustomerActions['deleteCustomer'];
  clearAllCustomers: CustomerActions['clearAllCustomers'];
  addRenewalHistory: CustomerActions['addRenewalHistory'];
  getCustomersByAssignee: CustomerActions['getCustomersByAssignee'];
  fetchCustomers: CustomerActions['fetchCustomers'];
  
  // Follow-up related
  addFollowUp: (entityType: 'lead' | 'customer', entityId: string | number, followUp: NewFollowUpData) => Promise<void>;
  getPendingFollowUps: FollowUpActions['getPendingFollowUps'];
  markFollowUpAsDone: FollowUpActions['markFollowUpAsDone'];
  
  // Conversion related
  convertLeadToCustomer: ConversionActions['convertLeadToCustomer'];
  
  // Communication related
  addCommunication: CommunicationActions['addCommunication'];
  getCommunicationHistoryForEntity: CommunicationActions['getCommunicationHistoryForEntity'];
  getAllCommunicationHistory: CommunicationActions['getAllCommunicationHistory'];
  isLoadingCommunicationHistory: boolean;
  errorLoadingCommunicationHistory: string | null;
  
  // User management
  users: User[];
  isLoadingUsers: boolean;
  errorLoadingUsers: string | null;
  fetchUsers: () => Promise<void>;
  addUser: (userData: UserCreationPayload) => Promise<User>;
  addAdmin: (adminData: FormData) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  updateUserPermissions: (userId: string, permissions: UserPermissions) => Promise<User>;
  
  // Remarks
  addRemark: (entityType: 'lead' | 'customer', entityId: string | number, remarkText: string) => Promise<unknown>;
  
  // Developer Admin Filter
  developerAdminFilterId: string | null;
  setDeveloperAdminFilter: (adminId: string | null) => void;
}

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);
  // --- State for Developer Admin Filter ---
  const [developerAdminFilterId, setDeveloperAdminFilterId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setErrorUsers(null);
    try {
      console.log("Attempting to fetch users via API...");
      const fetchedUsers = await userService.getAllUsers();
      console.log("Fetched users:", fetchedUsers);
      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      setErrorUsers(err instanceof Error ? err.message : 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // --- User Management Actions ---
  const addUser = useCallback(async (userData: UserCreationPayload) => {
    try {
      const newUser = await userService.createUser(userData);
      setUsers(prev => [...prev, newUser]);
      return newUser;
    } catch (error) {
      console.error("Error adding user in context:", error);
      throw error;
    }
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      await userService.deleteUser(userId);
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
       console.error(`Error deleting user ${userId} in context:`, error);
       throw error;
    }
  }, []);

  const updateUserPermissions = useCallback(async (userId: string, permissions: UserPermissions) => {
    try {
      const updatedUser = await userService.updateUserPermissions(userId, permissions);
      setUsers(prev => prev.map(user => user.id === userId ? { ...user, ...updatedUser } : user));
      return updatedUser;
    } catch (error) {
      console.error(`Error updating permissions for user ${userId} in context:`, error);
      throw error;
    }
  }, []);

  // --- Add Admin Action ---
  const addAdmin = useCallback(async (adminData: FormData) => {
    try {
      const newAdmin = await userService.addAdmin(adminData);
      setUsers(prev => [...prev, newAdmin]);
      return newAdmin;
    } catch (error) {
      console.error("Error adding admin in context:", error);
      throw error;
    }
  }, []);
  // --- End Add Admin Action ---

  // --- Add Remark Action ---
  const addRemark = useCallback(async (entityType: 'lead' | 'customer', entityId: string | number, remarkText: string) => {
    try {
      const newRemark = await addRemarkService({ entityType, entityId, remarkText });
      // TODO: Optionally update communication history state immediately 
      // or rely on the history component re-fetching after dialog closes.
      // For simplicity now, we won't update state here, assuming re-fetch.
      return newRemark;
    } catch (error) {
      console.error("Error adding remark in context:", error);
      throw error;
    }
  }, []);
  // --- End Add Remark Action ---

  // --- Set Developer Admin Filter Action ---
  const setDeveloperAdminFilter = useCallback((adminId: string | null) => {
    console.log("[CRMContext] Setting developer admin filter:", adminId);
    setDeveloperAdminFilterId(adminId);
  }, []);
  // --- End Set Developer Admin Filter Action ---

  // --- End User Management Actions ---

  // Initialize slices
  const authSlice = useAuthSlice();
  const leadSlice = useLeadSlice();
  const customerSlice = useCustomerSlice();
  const communicationSlice = useCommunicationSlice(
    leadSlice.leads,
    customerSlice.customers,
    users,
    leadSlice.updateLead,
    customerSlice.updateCustomer
  );

  // Destructure fetch functions
  const { fetchLeads: fetchLeadsFromSlice } = leadSlice;
  const { fetchCustomers: fetchCustomersFromSlice } = customerSlice;
  const { fetchCommunicationHistory: fetchCommHistoryFromSlice } = communicationSlice;

  // --- Trigger data fetching based on authentication ---
  useEffect(() => {
    if (authSlice.isAuthenticated) {
      console.log("[CRMContext] Auth successful. Initial data fetch.");
      fetchLeadsFromSlice();
      fetchUsers();
      fetchCustomersFromSlice(developerAdminFilterId); // Initial fetch might pass null
      fetchCommHistoryFromSlice();
    } else {
      console.log("[CRMContext] User not authenticated, clearing data.");
      setUsers([]);
    }
  }, [authSlice.isAuthenticated, fetchLeadsFromSlice, fetchUsers, fetchCustomersFromSlice, fetchCommHistoryFromSlice, developerAdminFilterId]); // Add all dependencies back

  // --- Effect for developerAdminFilterId changes ---
  useEffect(() => {
    if (authSlice.isAuthenticated && authSlice.currentUser?.role === 'developer') {
      console.log(`[CRMContext] developerAdminFilterId changed to: ${developerAdminFilterId}. Refetching customers for developer.`);
      fetchCustomersFromSlice(developerAdminFilterId);
    }
  }, [developerAdminFilterId, authSlice.isAuthenticated, authSlice.currentUser?.role, fetchCustomersFromSlice]);

  // Create adapter functions to handle type differences between slices
  const adaptedLeadFollowUp = async (leadId: string, followUpData: NewFollowUpData): Promise<void> => {
    if (!leadSlice.addLeadFollowUp) return;
    
    // Convert NewFollowUpData to FollowUp for leadSlice
    const followUp: FollowUp = {
      id: '', // Will be set by the backend
      date: new Date(),
      notes: followUpData.notes,
      nextCallDate: new Date(followUpData.nextCallDate), // Convert string to Date
      leadId: leadId,
      createdBy: '' // Will be set by the backend
    };
    
    await leadSlice.addLeadFollowUp(leadId, followUp);
  };
  
  const adaptedCustomerFollowUp = async (customerId: string, followUpData: NewFollowUpData): Promise<void> => {
    if (!customerSlice.addCustomerFollowUp) return;
    
    // Convert NewFollowUpData to FollowUp for customerSlice
    const followUp: FollowUp = {
      id: '', // Will be set by the backend
      date: new Date(),
      notes: followUpData.notes,
      nextCallDate: new Date(followUpData.nextCallDate), // Convert string to Date
      customerId: customerId,
      createdBy: '' // Will be set by the backend
    };
    
    await customerSlice.addCustomerFollowUp(customerId, followUp);
  };

  const followUpSlice = useFollowUpSlice({
    leads: leadSlice.leads, 
    customers: customerSlice.customers,
    addLeadFollowUp: adaptedLeadFollowUp,
    addCustomerFollowUp: adaptedCustomerFollowUp,
    updateLeadInState: leadSlice.updateLeadLocalState,
    updateCustomerInState: customerSlice.updateCustomer,
  });
  
  const conversionSlice = useConversionSlice(
    leadSlice.leads,
    leadSlice.updateLead,
    customerSlice.addCustomer
  );
  
  const contextValue: CRMContextType = {
    leads: leadSlice.leads,
    isLoadingLeads: leadSlice.isLoadingLeads,
    errorLoadingLeads: leadSlice.errorLoadingLeads,
    customers: customerSlice.customers,
    isLoadingCustomers: customerSlice.isLoadingCustomers,
    errorLoadingCustomers: customerSlice.errorLoadingCustomers,
    users,
    isLoadingUsers: loadingUsers,
    errorLoadingUsers: errorUsers,
    currentUser: authSlice.currentUser,
    
    isAuthenticated: authSlice.isAuthenticated,
    isLoadingAuth: authSlice.isLoadingAuth,
    login: authSlice.login,
    logout: authSlice.logout,
    hasServiceTypeAccess: authSlice.hasServiceTypeAccess,
    loginWithGoogle: authSlice.loginWithGoogle,
    
    addLead: leadSlice.addLead,
    updateLead: leadSlice.updateLead,
    deleteLead: leadSlice.deleteLead,
    assignLead: leadSlice.assignLead,
    clearAllLeads: leadSlice.clearAllLeads,
    fetchLeads: leadSlice.fetchLeads,
    
    addCustomer: customerSlice.addCustomer,
    updateCustomer: customerSlice.updateCustomer,
    deleteCustomer: customerSlice.deleteCustomer,
    clearAllCustomers: customerSlice.clearAllCustomers,
    addRenewalHistory: customerSlice.addRenewalHistory,
    getCustomersByAssignee: customerSlice.getCustomersByAssignee,
    fetchCustomers: customerSlice.fetchCustomers,
    
    addFollowUp: followUpSlice.addFollowUp,
    getPendingFollowUps: followUpSlice.getPendingFollowUps,
    markFollowUpAsDone: followUpSlice.markFollowUpAsDone,
    convertLeadToCustomer: conversionSlice.convertLeadToCustomer,
    addCommunication: communicationSlice.addCommunication,
    getCommunicationHistoryForEntity: communicationSlice.getCommunicationHistoryForEntity,
    getAllCommunicationHistory: communicationSlice.getAllCommunicationHistory,
    
    getLeadsByAssignee: leadSlice.getLeadsByAssignee,
    isLoadingCommunicationHistory: communicationSlice.isLoadingHistory,
    errorLoadingCommunicationHistory: communicationSlice.errorLoadingHistory,

    fetchUsers,
    addUser,
    addAdmin,
    deleteUser,
    updateUserPermissions,
    addRemark,

    // Developer Admin Filter
    developerAdminFilterId,
    setDeveloperAdminFilter,
  };
  
  return <CRMContext.Provider value={contextValue}>{children}</CRMContext.Provider>;
};
