import { query, QueryParamValue } from '../db';

// Define types locally (consider shared types later)
type Role = 'developer' | 'admin' | 'employee';

interface UserPermissions {
  [key: string]: unknown;
  viewLeads?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  viewCustomers?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  // Add other relevant permissions if needed by the logic below
}

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: UserPermissions;
}

interface AdminUser {
    id: string;
    name: string;
}

interface Lead {
    id: string;
    createdBy: string;
    serviceTypes: string[]; // Changed from serviceType to serviceTypes array
}

interface Customer {
    id: string;
    createdBy: string;
    serviceTypes: string[]; // Changed from serviceType to serviceTypes array
    nextRenewal?: Date;
}

interface AdminMetrics {
    totalLeads: number;
    totalCustomers: number;
    pendingRenewals: number;
    conversionRate: number;
}

interface AdminDashboardSummary {
    adminId: string;
    adminName: string;
    metrics: AdminMetrics;
}

// --- Add Service Type Distribution Interface ---
interface ServiceTypeCount {
    serviceType: string;
    count: number;
}
// --- End Add ---

/**
 * Calculates dashboard metrics for a specific set of leads and customers.
 */
const calculateMetrics = (leads: Lead[], customers: Customer[]): AdminMetrics => {
    const totalLeads = leads.length;
    const totalCustomers = customers.length;

    const pendingRenewals = customers.filter(c => {
        if (!c.nextRenewal) return false;
        const now = new Date();
        const renewalDate = new Date(c.nextRenewal);
        // Ensure renewalDate is valid before comparison
        if (isNaN(renewalDate.getTime())) return false; 
        const daysUntilRenewal = Math.floor((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilRenewal <= 30 && daysUntilRenewal >= 0;
    }).length;

    const conversionRate = totalLeads > 0
        ? Math.round((totalCustomers / totalLeads) * 100)
        : 0;

    return {
        totalLeads,
        totalCustomers,
        pendingRenewals,
        conversionRate,
    };
};

/**
 * Fetches dashboard summary metrics grouped by each Admin user.
 * Only accessible by Developers.
 */
export const getAdminDashboardSummary = async (adminIdParam?: string): Promise<AdminDashboardSummary[]> => {
    try {
        let admins: AdminUser[] = [];

        // --- Fetch specific admin if adminIdParam is provided, otherwise fetch all admins ---
        if (adminIdParam) {
            const adminResult = await query('SELECT id, name FROM users WHERE role = $1 AND id = $2', ['admin', adminIdParam]);
            if (adminResult.rows.length > 0) {
                admins = adminResult.rows;
            } else {
                console.log(`[DashboardService] Admin with ID ${adminIdParam} not found.`);
                return []; // Return empty if specific admin not found
            }
        } else {
            const adminResult = await query('SELECT id, name FROM users WHERE role = $1', ['admin']);
            admins = adminResult.rows;
        }
        // --- End modification for fetching admins ---

        if (admins.length === 0) {
            console.log("[DashboardService] No admin users found to summarize.");
            return [];
        }
        console.log(`[DashboardService] Found ${admins.length} admins.`);

        // 2. Fetch all leads and customers (consider performance for very large datasets)
        // Select only necessary fields and aggregate service types
        const leadsResult = await query(`
            SELECT 
                l.id, 
                l.created_by as "createdBy",
                array_agg(lst.service_type) as "serviceTypes"
            FROM leads l
            LEFT JOIN lead_service_types lst ON l.id = lst.lead_id
            GROUP BY l.id, l.created_by
        `, []);
        const allLeads: Lead[] = leadsResult.rows;

        const customersResult = await query(`
            SELECT 
                c.id, 
                c.created_by as "createdBy",
                array_agg(cst.service_type) as "serviceTypes",
                c.next_renewal as "nextRenewal"
            FROM customers c
            LEFT JOIN customer_service_types cst ON c.id = cst.customer_id
            GROUP BY c.id, c.created_by, c.next_renewal
        `, []);
        const allCustomers: Customer[] = customersResult.rows;

        // 3. Fetch all employees to map admin creators
        const employeesResult = await query('SELECT id, created_by_admin_id as "createdByAdminId" FROM users WHERE role = $1', ['employee']);
        const employees = employeesResult.rows;
        
        // Build a map of adminId -> list of employeeIds they created
        const adminEmployeeMap: { [adminId: string]: string[] } = {};
        for (const emp of employees) {
            if (emp.createdByAdminId) {
                if (!adminEmployeeMap[emp.createdByAdminId]) {
                    adminEmployeeMap[emp.createdByAdminId] = [];
                }
                adminEmployeeMap[emp.createdByAdminId].push(emp.id);
            }
        }

        // 4. Calculate metrics for each admin
        const summaries: AdminDashboardSummary[] = admins.map(admin => {
            // Get leads and customers created by this admin or their employees
            const adminEmployeeIds = adminEmployeeMap[admin.id] || [];
            const adminLeads = allLeads.filter(lead => 
                lead.createdBy === admin.id || adminEmployeeIds.includes(lead.createdBy)
            );
            const adminCustomers = allCustomers.filter(customer => 
                customer.createdBy === admin.id || adminEmployeeIds.includes(customer.createdBy)
            );

            return {
                adminId: admin.id,
                adminName: admin.name,
                metrics: calculateMetrics(adminLeads, adminCustomers)
            };
        });

        return summaries;
    } catch (error) {
        console.error('Error fetching admin dashboard summary:', error);
        throw error;
    }
};

// --- Add Service Type Distribution Function ---
/**
 * Fetches the distribution of service types based on the user's access 
 * OR for a specific target admin if targetAdminId is provided (for developer dashboard).
 */
export const getServiceTypeDistribution = async (user: AuthenticatedUser, targetAdminId?: string): Promise<ServiceTypeCount[]> => {
    
    let leadVisibilityConditions = "1=1"; 
    let customerVisibilityConditions = "1=1";
    const params: QueryParamValue[] = [];
    let paramIndex = 1;

    // --- Logic for targetAdminId (Developer Dashboard Filter) ---
    if (targetAdminId) {
        // If a specific admin is targeted, override user-based permission checks
        // Fetch leads/customers created by this admin OR their direct employees
        const adminEmployeesResult = await query('SELECT id FROM users WHERE created_by_admin_id = $1', [targetAdminId]);
        const employeeIds = adminEmployeesResult.rows.map(r => r.id);
        const relevantUserIdsForTargetAdmin = [targetAdminId, ...employeeIds];
        
        if (relevantUserIdsForTargetAdmin.length > 0) {
            const placeholders = relevantUserIdsForTargetAdmin.map((_, i) => `$${paramIndex + i}`).join(', ');
            leadVisibilityConditions = `l.created_by IN (${placeholders})`;
            customerVisibilityConditions = `c.created_by IN (${placeholders})`; // Assuming created_by for customers too
            params.push(...relevantUserIdsForTargetAdmin);
            paramIndex += relevantUserIdsForTargetAdmin.length;
        } else {
            // Should not happen if targetAdminId is a valid admin, but as a fallback:
            leadVisibilityConditions = `l.created_by = $${paramIndex}`; 
            customerVisibilityConditions = `c.created_by = $${paramIndex}`;
            params.push(targetAdminId);
            paramIndex++;
        }
        console.log(`[getServiceTypeDistribution] Filtering for targetAdminId: ${targetAdminId}`);

    } else {
        // --- Original Logic based on the calling user's permissions ---
        const leadViewScope = user.permissions?.viewLeads || 'none';
        const customerViewScope = user.permissions?.viewCustomers || 'none';

        if (user.role === 'employee') {
            leadVisibilityConditions = `(l.assigned_to = $${paramIndex} OR l.created_by = $${paramIndex})`;
            // Assuming customer visibility for employee is similar for now
            customerVisibilityConditions = `(c.assigned_to = $${paramIndex} OR c.created_by = $${paramIndex})`;
            params.push(user.id);
            paramIndex++;
        } else if (user.role === 'admin') {
            // --- Lead Visibility for Admin ---
            if (leadViewScope === 'assigned') {
                leadVisibilityConditions = `l.assigned_to = $${paramIndex}`;
                params.push(user.id);
                paramIndex++;
            } else if (leadViewScope === 'created') {
                leadVisibilityConditions = `l.created_by = $${paramIndex}`;
                params.push(user.id);
                paramIndex++;
            } else if (leadViewScope === 'subordinates') {
                 const adminEmployeesResult = await query('SELECT id FROM users WHERE created_by_admin_id = $1', [user.id]);
                 const employeeIds = adminEmployeesResult.rows.map(r => r.id);
                 const relevantUserIds = [user.id, ...employeeIds];
                 if (relevantUserIds.length > 0) {
                    const placeholders = relevantUserIds.map((_, i) => `$${paramIndex + i}`).join(', ');
                    leadVisibilityConditions = `(l.created_by IN (${placeholders}) OR l.assigned_to IN (${placeholders}))`;
                    params.push(...relevantUserIds);
                    paramIndex += relevantUserIds.length;
                 } else {
                     leadVisibilityConditions = `(l.created_by = $${paramIndex} OR l.assigned_to = $${paramIndex})`; 
                     params.push(user.id);
                     paramIndex++;
                 }
            } else if (leadViewScope !== 'all') {
                 leadVisibilityConditions = '1=0'; 
            }
            // Note: Params array might grow with different user IDs. Ensure paramIndex is managed carefully.
            // Reset paramIndex or use a new one if admin conditions for customers use different params.
            // For simplicity, let's assume customer conditions will append to existing params for now.

            // --- Customer Visibility for Admin ---
            if (customerViewScope === 'assigned') {
                customerVisibilityConditions = `c.assigned_to = $${paramIndex}`;
                params.push(user.id); // May add user.id again if not already present for leads
                paramIndex++;
            } else if (customerViewScope === 'created') {
                customerVisibilityConditions = `c.created_by = $${paramIndex}`;
                params.push(user.id); // May add user.id again
                paramIndex++;
            } else if (customerViewScope === 'subordinates') {
                 const adminEmployeesResult = await query('SELECT id FROM users WHERE created_by_admin_id = $1', [user.id]);
                 const employeeIds = adminEmployeesResult.rows.map(r => r.id);
                 const relevantUserIds = [user.id, ...employeeIds];
                 if (relevantUserIds.length > 0) {
                     const placeholders = relevantUserIds.map((_, i) => `$${paramIndex + i}`).join(', ');
                     customerVisibilityConditions = `(c.created_by IN (${placeholders}) OR c.assigned_to IN (${placeholders}))`;
                     params.push(...relevantUserIds); // May add user.id and employeeIds again
                     paramIndex += relevantUserIds.length;
                 } else {
                     customerVisibilityConditions = `(c.created_by = $${paramIndex} OR c.assigned_to = $${paramIndex})`;
                     params.push(user.id);
                     paramIndex++;
                 }
            } else if (customerViewScope !== 'all') {
                 customerVisibilityConditions = '1=0';
            }
        } else if (user.role === 'developer') {
            // Developer sees all, conditions remain "1=1" unless specific denies
            // This case is implicitly handled by default initializations if no other role matches.
        } else {
             // Fallback for any other roles or unexpected scenarios
             leadVisibilityConditions = '1=0';
             customerVisibilityConditions = '1=0';
        }
        console.log(`[getServiceTypeDistribution] Filtering based on user ${user.id} (Role: ${user.role}) permissions.`);
    }
    // --- End Logic for targetAdminId vs User Permissions ---

    // --- Construct Final Query --- 
    const sqlQuery = `
        WITH visible_leads AS (
            SELECT l.id
            FROM leads l
            WHERE ${leadVisibilityConditions}
        ),
        visible_customers AS (
            SELECT c.id
            FROM customers c
            WHERE ${customerVisibilityConditions}
        )
        SELECT 
            service_type as "serviceType", 
            COUNT(*) as count
        FROM (
            SELECT lst.service_type 
            FROM lead_service_types lst
            JOIN visible_leads vl ON lst.lead_id = vl.id
            UNION ALL 
            SELECT cst.service_type 
            FROM customer_service_types cst
            JOIN visible_customers vc ON cst.customer_id = vc.id
        ) as accessible_service_types
        WHERE service_type IS NOT NULL
        GROUP BY service_type
        ORDER BY count DESC;
    `;

    try {
        console.log("[getServiceTypeDistribution] Query:", sqlQuery.replace(/\s+/g, ' ')); // Log query
        console.log("[getServiceTypeDistribution] Params:", params); // Log params
        const result = await query(sqlQuery, params);
        // Ensure count is parsed as a number
        return result.rows.map(row => ({ 
            ...row, 
            count: parseInt(row.count, 10) 
        }));
    } catch (error) {
        console.error('Error fetching service type distribution:', error);
        throw error;
    }
};
// --- End Add --- 