// CRM Data Types

export type Role = 
  | 'developer' 
  | 'admin' 
  | 'employee' 
  | 'relationship_manager' 
  | 'operations_executive' 
  | 'accountant' 
  | 'senior_sales_manager' 
  | 'junior_sales_manager'
  | 'manager'
  | 'executive';

export type ServiceType = "training" | "wealth" | "equity" | "insurance" | "mutual_funds" | "PMS" | "AIF" | "others";

export const ServiceTypeEnum = {
  TRAINING: "training",
  WEALTH: "wealth",
  EQUITY: "equity",
  INSURANCE: "insurance",
  MUTUAL_FUNDS: "mutual_funds",
  PMS: "PMS",
  AIF: "AIF",
  OTHERS: "others"
} as const;

// Lead status types
export type TrainingLeadStatus = 'new' | 'not_connected' | 'follow_up' | 'ready_to_attend' | 'attended';
export type WealthLeadStatus = 'new' | 'not_connected' | 'follow_up' | 'interested' | 'consultation_done';

// Customer status types
export type TrainingCustomerStatus = 'email_sent' | 'form_filled' | 'payment_made' | 'documents_submitted' | 'classes_started' | 'completed';
export type WealthCustomerStatus = 'email_sent' | 'form_filled' | 'documents_submitted' | 'account_started' | 'initial_investment' | 'active';
// Combine customer status types
export type CustomerStatus = TrainingCustomerStatus | WealthCustomerStatus;

export const CustomerStatusEnum = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended"
} as const;

// Define payment type
export type PaymentType = 'full_payment' | 'partial_payment' | 'card' | 'bank_transfer' | 'cash' | 'installment';

// Define renewal status type
export type RenewalStatus = 'renewed' | 'expired' | 'pending' | 'cancelled';

// Define RenewalHistory type
export interface RenewalHistory {
  date: Date;
  amount?: number;
  status: RenewalStatus;
  notes?: string;
  nextRenewalDate?: Date;
}

// Define a type for Communication History entries
export interface HistoryEntry {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'remark';
  leadId?: string;
  customerId?: string;
  notes?: string;
  createdBy: string;
  date: Date;
  duration?: number;
  callStatus?: 'completed' | 'missed' | 'cancelled';
  recordingData?: string;
  recordingUrl?: string;
  recipient?: string;
  emailSubject?: string;
  emailBody?: string;
  recipientName?: string;
  remarkText?: string;
}

// --- Permission Types ---
export type DataAccessScope = 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
export type CommunicationAccessScope = 'all' | 'assignedContacts' | 'created' | 'none';
export type UserViewScope = 'all' | 'subordinates' | 'none';

export interface UserPermissions {
  // Leads
  viewLeads: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  createLeads: boolean;
  editLeads: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  deleteLeads: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  assignLeads: boolean;

  // Customers
  viewCustomers: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  createCustomers: boolean;
  editCustomers: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  deleteCustomers: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  assignCustomers: boolean;
  manageRenewals: boolean;

  // Communications
  viewCommunications: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  addCommunications: boolean;
  playRecordings: boolean;
  downloadRecordings: boolean;

  // User Management
  viewUsers: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  createAdmin: boolean;
  createEmployee: boolean;
  editUserPermissions: boolean;
  deleteUser: boolean;

  // System Level
  clearSystemData: boolean;

  // Service Type Access
  allowedServiceTypes: ServiceType[];
}
// --- End Permission Types ---

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  position?: string;
  permissions: UserPermissions;
  createdAt: Date;
  createdBy?: string; // Admin who created this user

  // --- Fields for RBAC & User Management ---
  createdByAdminId?: string | null;    // NEW: ID of the Admin who created this user (if applicable)
  employeeCreationLimit?: number | null; // NEW: Max employees an Admin can create (null for Dev/Employee)
  // --- End New Fields ---

  assignedLeads?: string[];
  serviceTypeAccess?: ServiceType[];
  google_id?: string | null;
  logoUrl?: string;
}

export interface FollowUp {
  id: string;
  date: Date;
  notes: string;
  nextCallDate: Date;
  leadId?: string;
  customerId?: string;
  createdBy: string;
}

export type LeadType = 'hot' | 'warm' | 'cold' | 'not_contacted';

export interface Lead {
  id: string | number;
  name: string;
  mobile: string;
  email: string;
  city: string;
  aum?: number;
  company?: string;
  assignedTo?: string;
  createdBy?: string;
  serviceTypes: ServiceType[];
  status: TrainingLeadStatus | WealthLeadStatus;
  lead_status: LeadType;
  lastWebinarDate?: Date;
  createdAt: Date;
  followUps: FollowUp[];
  leadSource?: 'walk_in' | 'reference';
  referredBy?: string;
  communicationHistory?: HistoryEntry[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  mobile: string;
  city: string;
  serviceTypes: ServiceType[];
  status: string;
  assignedTo: string;
  startDate: Date;
  createdAt: Date;
  createdBy?: string;
  leadId?: string | number;
  paymentType?: PaymentType;
  paymentStatus?: 'completed' | 'not_completed';
  aum?: number;
  nextRenewal?: Date;
  nextReview?: Date;
  reviewRemarks?: string;
  batchNo?: string;
  dob?: Date;
  address?: string;
  company?: string;
  engagementFlags?: {
    welcomeEmail: boolean;
    community: boolean;
    calls: boolean;
  };
  followUps?: FollowUp[];
  renewalHistory?: RenewalHistory[];
  communicationHistory?: HistoryEntry[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  role: Role | null;
}

// Types for Authentication API calls
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

// --- Default Permission Constants ---
export const DEFAULT_DEVELOPER_PERMISSIONS: Required<UserPermissions> = {
  viewLeads: 'all', createLeads: true, editLeads: 'all', deleteLeads: 'all', assignLeads: true,
  viewCustomers: 'all', createCustomers: true, editCustomers: 'all', deleteCustomers: 'all', assignCustomers: true, manageRenewals: true,
  viewCommunications: 'all', addCommunications: true, playRecordings: true, downloadRecordings: true,
  viewUsers: 'all', createAdmin: true, createEmployee: true, editUserPermissions: true, deleteUser: true, 
  clearSystemData: true,
  allowedServiceTypes: ['training', 'wealth', 'equity', 'insurance', 'mutual_funds', 'PMS', 'AIF', 'others']
};

export const DEFAULT_ADMIN_PERMISSIONS: Required<UserPermissions> = {
  viewLeads: 'created', createLeads: true, editLeads: 'created', deleteLeads: 'created', assignLeads: true, 
  viewCustomers: 'subordinates', createCustomers: true, editCustomers: 'created', deleteCustomers: 'created', assignCustomers: true, manageRenewals: true,
  viewCommunications: 'created', addCommunications: true, playRecordings: true, downloadRecordings: true,
  viewUsers: 'subordinates', createAdmin: false, createEmployee: true, editUserPermissions: true, deleteUser: true, 
  clearSystemData: false,
  allowedServiceTypes: ['training', 'wealth', 'equity', 'insurance', 'mutual_funds', 'PMS', 'AIF', 'others']
};

export const DEFAULT_EMPLOYEE_PERMISSIONS: UserPermissions = {
  viewLeads: 'assigned', createLeads: true, editLeads: 'assigned', deleteLeads: 'none', assignLeads: false,
  viewCustomers: 'assigned', createCustomers: true, editCustomers: 'assigned', deleteCustomers: 'none', assignCustomers: false, manageRenewals: false,
  viewCommunications: 'assigned', addCommunications: true, playRecordings: true, downloadRecordings: false,
  viewUsers: 'none', createAdmin: false, createEmployee: false, editUserPermissions: false, deleteUser: false, 
  clearSystemData: false,
  allowedServiceTypes: ['training'] // Default to training only for new employees
};
// --- End Default Permission Constants ---

export interface CommunicationRecord {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'other';
  date: Date;
  notes: string;
  related_follow_up_id?: string;
  created_by: string;
  lead_id?: string;
  customer_id?: string;
  duration?: number;
  call_status?: 'completed' | 'missed' | 'cancelled';
  recording_url?: string;
  email_subject?: string;
  email_body?: string;
  parent_email_id?: string;
  is_reply?: boolean;
  sender_name?: string;
  recipient_email?: string;
}

export interface AuthUserInfo {
  id: string;
  role: Role;
  permissions: UserPermissions;
}
