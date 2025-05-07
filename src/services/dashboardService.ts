import { api } from './api'; // Corrected relative path
import { UserPermissions } from '../types'; // Import necessary types

// Define the expected structure of the summary data from the backend
interface AdminMetrics {
    totalLeads: number;
    totalCustomers: number;
    pendingRenewals: number;
    conversionRate: number;
}

export interface AdminDashboardSummary {
    adminId: string;
    adminName: string;
    metrics: AdminMetrics;
}

/**
 * Fetches the admin dashboard summary data (metrics per admin).
 * Requires developer permissions.
 */
export const getAdminDashboardSummary = async (): Promise<AdminDashboardSummary[]> => {
    try {
        const data = await api.get('/dashboard/admin-summary'); // Use your API utility
        return data as AdminDashboardSummary[];
    } catch (error) {
        console.error("Error fetching admin dashboard summary:", error);
        // Re-throw or handle as appropriate for your error handling strategy
        throw error; 
    }
}; 