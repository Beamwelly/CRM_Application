// Define types locally until shared package is set up
export type Role = 'developer' | 'admin' | 'employee';

export interface UserPermissions {
    // ... (copy permissions structure from src/types) ...
    viewLeads?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';       
    editLeads?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
    deleteLeads?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
    assignLeads?: boolean;
    createLeads?: boolean;
    viewCustomers?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
    editCustomers?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
    deleteCustomers?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
    createCustomers?: boolean;
    manageRenewals?: boolean;
    viewUsers?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';       
    editUserPermissions?: boolean;
    deleteUser?: boolean;
    createEmployee?: boolean;
    createAdmin?: boolean;
    addCommunications?: boolean;
    viewCommunications?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
    playRecordings?: boolean;
    downloadRecordings?: boolean;
    clearSystemData?: boolean;
}

export interface User {
    // ... (copy user structure from src/types, EXCLUDING password) ...
    id: string;
    name: string;
    email: string;
    role: Role;
    position?: string;
    serviceTypeAccess?: string[]; // Or adjust if using permissions fully
    permissions: UserPermissions;
    createdAt: Date; 
    createdBy?: string | null;
    employeeCreationLimit?: number | null;
    createdByAdminId?: string | null; 
    google_id?: string | null; // Add google_id if not present
    logoUrl?: string; // ADDED for custom admin logo
}

export interface LoginCredentials {
    email: string;
    password?: string; // Make password optional for potential Google Sign-in flows later
    role?: Role; // Keep role optional or remove if backend determines it
}

export interface AuthResponse {
    user: User;
    token: string;
}

// Create the file with the above content 

export {}; 