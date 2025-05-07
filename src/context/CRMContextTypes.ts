import { Lead, Customer, User, FollowUp, Role, RenewalHistory, ServiceType, LoginCredentials, HistoryEntry, UserPermissions } from '@/types';

// Define UserCreationPayload locally or import if shared
type UserCreationPayload = Omit<User, 'id' | 'createdAt'> & { password?: string };

// Define AddAdminPayload here
type AddAdminPayload = {
  name: string;
  email: string;
  password?: string;
  employeeCreationLimit?: number | null;
}

export interface CRMContextType {
  // Data
  leads: Lead[];
  isLoadingLeads?: boolean;
  errorLoadingLeads?: string | null;
  customers: Customer[];
  isLoadingCustomers?: boolean;
  errorLoadingCustomers?: string | null;
  users: User[];
  isLoadingUsers?: boolean;
  errorLoadingUsers?: string | null;
  currentUser: User | null;
  
  // Authentication
  isAuthenticated: boolean;
  isLoadingAuth?: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  hasServiceTypeAccess: (serviceType: ServiceType) => boolean;
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  
  // Lead Management
  addLead: (leadData: Omit<Lead, 'createdAt' | 'followUps' | 'id'>) => Promise<void>;
  updateLead: (updatedLead: Lead) => Promise<void>;
  deleteLead: (id: string | number) => Promise<void>;
  assignLead: (leadId: string | number, userId: string) => Promise<void>;
  clearAllLeads: () => Promise<void>;
  fetchLeads?: () => Promise<void>;
  
  // Customer Management
  addCustomer: (customerData: Omit<Customer, 'createdAt' | 'followUps' | 'id'>) => Promise<Customer>;
  updateCustomer: (updatedCustomer: Partial<Omit<Customer, 'id' | 'createdAt' | 'createdBy'>>) => Promise<void>;
  deleteCustomer: (id: string | number) => Promise<void>;
  clearAllCustomers: () => Promise<void>;
  addRenewalHistory: (customerId: string | number, history: RenewalHistory) => Promise<void>;
  getCustomersByAssignee: (userId: string) => Customer[];
  fetchCustomers?: () => Promise<void>;
  
  // Follow-up Management
  addFollowUp: (entityType: 'lead' | 'customer', entityId: string | number, followUp: Omit<FollowUp, 'id' | 'leadId' | 'customerId'>) => void;
  getPendingFollowUps: (userId?: string) => ({ type: 'lead' | 'customer', entity: Lead | Customer, followUp: FollowUp })[];
  
  // Lead Conversion
  convertLeadToCustomer: (leadId: string | number) => Promise<Customer | null>;
  
  // Communication Management
  addCommunication: (record: Omit<HistoryEntry, 'id' | 'date'>) => Promise<HistoryEntry>;
  getCommunicationHistoryForEntity: (entityId: string | number) => Promise<HistoryEntry[]>;
  getAllCommunicationHistory: () => Promise<HistoryEntry[]>;
  isLoadingCommunicationHistory?: boolean;
  errorLoadingCommunicationHistory?: string | null;
  
  // Filtering
  getLeadsByAssignee: (userId: string) => Lead[];
  
  // --- User Management ---
  fetchUsers: () => Promise<void>;
  addUser: (userData: UserCreationPayload) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  updateUserPermissions: (userId: string, permissions: UserPermissions) => Promise<User>;
  addAdmin: (adminData: AddAdminPayload) => Promise<User>;

  // --- Remark Management ---
  addRemark: (entityType: 'lead' | 'customer', entityId: string | number, remarkText: string) => Promise<HistoryEntry>;

  // --- Developer Admin Filter ---
  developerAdminFilterId: string | null;
  setDeveloperAdminFilter: (adminId: string | null) => void;
}
