import { query, QueryParamValue, getPool } from '../db';
import { Request, Response, NextFunction } from 'express';

// Define types directly in the service file
type Role = 'developer' | 'admin' | 'employee';

// Assuming FollowUp type is defined elsewhere or we define a minimal one here
// For consistency, let's assume it's available from a shared types directory or defined as needed
interface FollowUp {
  id: string;
  date: Date;
  notes: string;
  nextCallDate: Date;
  leadId?: string;
  customerId?: string;
  createdBy: string;
}

interface UserPermissions {
  [key: string]: unknown;
  viewCustomers?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  createCustomers?: boolean;
  editCustomers?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  deleteCustomers?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  assignCustomers?: boolean;
}

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: UserPermissions;
}

// --- Define EngagementFlags interface ---
interface EngagementFlags {
  welcomeEmail: boolean;
  community: boolean;
  calls: boolean;
}
// --- End EngagementFlags interface ---

// --- Define RenewalStatus type ---
type RenewalStatus = "pending" | "renewed" | "cancelled" | "expired";
// --- End RenewalStatus type ---

// --- Define RenewalHistory interface ---
interface RenewalHistory {
  id: string; // Assuming DB generates UUID
  date: Date; // Date the renewal record was created/logged
  amount?: number;
  status: RenewalStatus;
  notes?: string;
  nextRenewalDate?: Date; // The actual date the *next* renewal is due
}
// --- End RenewalHistory interface ---

interface Customer {
  id: string;
  name: string;
  email: string;
  mobile: string;
  city: string;
  serviceTypes: string[];
  status: string;
  assignedTo: string;
  startDate: Date;
  createdAt: Date;
  createdBy?: string;
  leadId?: string;
  paymentType?: string;
  paymentStatus?: 'completed' | 'not_completed';
  aum?: number;
  nextRenewal?: Date;
  nextReview?: Date;
  reviewRemarks?: string;
  batchNo?: string;
  dob?: Date;
  address?: string;
  company?: string;
  engagementFlags?: EngagementFlags;
  followUps?: FollowUp[];
  renewalHistory?: RenewalHistory[]; // Added renewal history
}

export const getAllCustomers = async (user: AuthenticatedUser, targetAdminId?: string): Promise<Customer[]> => {
  let sqlQuery = `
    SELECT 
      c.*, 
      u.name as assigned_to_name,
      u.email as assigned_to_email,
      COALESCE(array_agg(DISTINCT cst.service_type) FILTER (WHERE cst.service_type IS NOT NULL), '{}') as service_types,
      COALESCE(
          json_agg(
              DISTINCT jsonb_build_object(
                  'id', f.id,
                  'date', f.date,
                  'notes', f.notes,
                  'nextCallDate', f.next_call_date,
                  'leadId', f.lead_id,
                  'customerId', f.customer_id,
                  'createdBy', f.created_by
              )
          ) FILTER (WHERE f.id IS NOT NULL), '[]'::json
      ) as "followUps",
      COALESCE(
          json_agg(
              DISTINCT jsonb_build_object(
                  'id', rh.id,
                  'date', rh.date,
                  'amount', rh.amount,
                  'status', rh.status,
                  'notes', rh.notes,
                  'nextRenewalDate', rh.next_renewal_date
              )
          ) FILTER (WHERE rh.id IS NOT NULL), '[]'::json
      ) as "renewalHistory"
    FROM customers c
    LEFT JOIN users u ON c.assigned_to = u.id
    LEFT JOIN customer_service_types cst ON c.id = cst.customer_id
    LEFT JOIN follow_ups f ON c.id = f.customer_id
    LEFT JOIN renewal_history rh ON c.id = rh.customer_id
  `;

  const params: QueryParamValue[] = [];
  let paramIndex = 1;

  // WHERE clause construction based on role/permissions
  const whereClauses: string[] = [];

  if (user.role === 'developer') {
    // Developers can see everything - no WHERE clause needed
    if (targetAdminId) {
      // If filtering for a specific admin, show their data and their employees' data
      const employeesResult = await query('SELECT id FROM users WHERE created_by_admin_id = $1', [targetAdminId]);
      const employeeIds = employeesResult.rows.map(row => row.id);
      const relevantUserIds = [targetAdminId, ...employeeIds];
      
      if (relevantUserIds.length > 0) {
        const placeholders = relevantUserIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
        whereClauses.push(`(c.created_by IN (${placeholders}) OR c.assigned_to IN (${placeholders}))`);
        params.push(...relevantUserIds);
        paramIndex += relevantUserIds.length;
      }
    }
  } else if (user.role === 'admin') {
    // Admins can see:
    // 1. Customers they created
    // 2. Customers assigned to them
    // 3. Customers created by their employees
    // 4. Customers assigned to their employees
    const employeesResult = await query('SELECT id FROM users WHERE created_by_admin_id = $1', [user.id]);
    const employeeIds = employeesResult.rows.map(row => row.id);
    const relevantUserIds = [user.id, ...employeeIds];
    
    if (relevantUserIds.length > 0) {
      const placeholders = relevantUserIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
      whereClauses.push(`(c.created_by IN (${placeholders}) OR c.assigned_to IN (${placeholders}))`);
      params.push(...relevantUserIds);
      paramIndex += relevantUserIds.length;
    }
  } else if (user.role === 'employee') {
    // Employees can only see:
    // 1. Customers they created
    // 2. Customers assigned to them
    whereClauses.push(`(c.created_by = $${paramIndex} OR c.assigned_to = $${paramIndex})`);
    params.push(user.id);
    paramIndex++;
  }

  // Add WHERE clause if we have conditions
  if (whereClauses.length > 0) {
    sqlQuery += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  // Group by and order
  sqlQuery += ` GROUP BY c.id, u.name, u.email ORDER BY c.created_at DESC`;

  try {
    const result = await query(sqlQuery, params);
    return result.rows;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};

export const createCustomer = async (
  customerData: Omit<Customer, 'id' | 'createdAt' | 'createdBy' | 'followUps'>, 
  creator: AuthenticatedUser
): Promise<Customer> => {
    const { 
        name, 
        email, 
        mobile, 
        city, 
        serviceTypes, 
        status, 
        assignedTo, 
        startDate, 
        leadId,
        paymentType,
        paymentStatus,
        aum,
        nextRenewal,
        nextReview,
        reviewRemarks,
        batchNo,
        dob,
        address,
        company,
        engagementFlags
    } = customerData;

    // Permission check - allow if user has createCustomers permission
    if (!creator.permissions?.createCustomers) {
        throw new Error('Permission denied: Cannot create customers.');
    }

    // If assigning to someone else, check assignCustomers permission
    if (assignedTo && assignedTo !== creator.id && !creator.permissions?.assignCustomers) {
        throw new Error('Permission denied: Cannot assign customers to other users.');
    }

    // Basic required field check
    if (!name || !email || !mobile || !city || !serviceTypes?.length) {
        throw new Error("Missing required fields for customer creation.");
    }

    const insertCustomerQuery = `
        WITH inserted_customer AS (
            INSERT INTO customers (
                name, email, mobile, city, status, assigned_to, start_date, 
                lead_id, payment_type, payment_status, aum, next_renewal, 
                next_review, review_remarks, batch_no, dob, address, company,
                engagement_flags, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
        )
        INSERT INTO customer_service_types (customer_id, service_type)
        SELECT id, unnest($21::text[])
        FROM inserted_customer
        RETURNING customer_id;
    `;

    const customerParams = [
        name,
        email,
        mobile,
        city,
        status || 'active',
        assignedTo || creator.id, // Default to creator if not assigned
        startDate || new Date(),
        leadId,
        paymentType,
        paymentStatus,
        aum,
        nextRenewal,
        nextReview,
        reviewRemarks,
        batchNo,
        dob,
        address,
        company,
        JSON.stringify(engagementFlags || { welcomeEmail: false, community: false, calls: false }),
        creator.id,
        serviceTypes
    ];

    try {
        const result = await getPool().query(insertCustomerQuery, customerParams);
        if (!result.rows[0]?.customer_id) {
            throw new Error('Failed to create customer: No customer ID returned');
        }

        // Create a communication record for the customer creation
        const communicationQuery = `
            INSERT INTO communication_records (
                customer_id, type, notes, created_by
            ) VALUES ($1, 'REMARK_ADDED', $2, $3)
            RETURNING id;
        `;
        
        await getPool().query(communicationQuery, [
            result.rows[0].customer_id,
            'Customer created',
            creator.id
        ]);

        // Get the created customer with all its relations
        const customer = await getCustomerById(result.rows[0].customer_id);
        if (!customer) {
            throw new Error('Failed to retrieve created customer');
        }

        return customer;
    } catch (error) {
        console.error('Error creating customer:', error);
        throw error;
    }
};

export const updateCustomer = async (
    id: string,
    updateData: Partial<Omit<Customer, 'id' | 'createdAt' | 'createdBy' | 'followUps'>>,
    updater: AuthenticatedUser
): Promise<Customer> => {
    // --- Permission Check --- 
    const editScope = updater.permissions?.editCustomers || 'none';
    
    if (editScope === 'none') {
        throw new Error('Permission denied: You do not have permission to edit customers.');
    }

    // Fetch basic info for permission check first
    let customerOwnerInfo: { createdBy?: string, assignedTo?: string } | undefined;
    try {
        const checkResult = await query(
            `SELECT created_by as "createdBy", assigned_to as "assignedTo"
             FROM customers WHERE id = $1`,
            [id]
        );
        if (checkResult.rows.length === 0) {
            throw new Error('Customer not found.');
        }
        customerOwnerInfo = checkResult.rows[0];
    } catch (fetchError) {
        console.error('Error fetching customer info for permission check:', fetchError);
        if (fetchError instanceof Error && fetchError.message === 'Customer not found.') throw fetchError;
        throw new Error('Failed to fetch customer information for permission check.');
    }
    
    // Perform permission logic based on scope
    if (editScope !== 'all') { 
        let canEdit = false;
        if (editScope === 'created' && customerOwnerInfo?.createdBy === updater.id) {
            canEdit = true;
        } else if (editScope === 'assigned' && customerOwnerInfo?.assignedTo === updater.id) {
            canEdit = true;
        } else if (editScope === 'subordinates' && updater.role === 'admin') {
            if (customerOwnerInfo?.createdBy === updater.id) {
                canEdit = true;
            } else if (customerOwnerInfo?.assignedTo) {
                // Check if assignedTo user is a subordinate
                try {
                    const subordinateCheck = await query(
                        'SELECT 1 FROM users WHERE id = $1 AND created_by_admin_id = $2', 
                        [customerOwnerInfo.assignedTo, updater.id]
                    );
                    if ((subordinateCheck.rowCount ?? 0) > 0) {
                        canEdit = true;
                    }
                } catch (subError) {
                    console.error('Error checking subordinate status:', subError);
                }
            }
        }

        if (!canEdit) {
            throw new Error(`Permission denied: You do not have permission to edit this specific customer based on scope '${editScope}'.`);
        }
    }

    const {
        serviceTypes, 
        ...otherUpdateData 
    } = updateData;

    const customerSetClauses = Object.keys(otherUpdateData)
        .map((key, index) => {
            if (key === 'engagementFlags' && otherUpdateData[key]) {
                return `engagement_flags = $${index + 1}`;
            }
            const dbColumn = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            return `${dbColumn} = $${index + 1}`;
        })
        .join(', ');

    const customerParams = Object.values(otherUpdateData).map(value => 
        typeof value === 'object' && value !== null ? JSON.stringify(value) : value
    );
    customerParams.push(id); 
    const customerParamIndex = customerParams.length;

    const updateCustomerQuery = `
        UPDATE customers
        SET ${customerSetClauses}
        WHERE id = $${customerParamIndex}
        RETURNING id;
    `;

    try {
        if (customerSetClauses.length > 0) {
            const updateResult = await getPool().query(updateCustomerQuery, customerParams);
            if (updateResult.rowCount === 0) {
                console.warn(`Customer ${id} not found or no changes applied to main table.`);
            }
        }

        if (serviceTypes !== undefined) { 
            await getPool().query(`DELETE FROM customer_service_types WHERE customer_id = $1`, [id]);

            if (serviceTypes.length > 0) {
                const insertServiceTypesQuery = `
                    INSERT INTO customer_service_types (customer_id, service_type)
                    SELECT $1, unnest($2::text[])
                `;
                await getPool().query(insertServiceTypesQuery, [id, serviceTypes]);
            }
        }

        return await getCustomerById(id);
    } catch (error) {
        console.error('Error updating customer:', error);
        throw error;
    }
};

export const deleteCustomer = async (
    customerId: string,
    deleter: AuthenticatedUser
): Promise<number> => {
    // --- Permission Check --- 
    const deleteScope = deleter.permissions?.deleteCustomers || 'none';
    
    if (deleteScope === 'none') {
        throw new Error('Permission denied: You do not have permission to delete customers.');
    }

    if (deleteScope !== 'all') {
        try {
            const customerResult = await query(
                'SELECT created_by as "createdBy", assigned_to as "assignedTo" FROM customers WHERE id = $1', 
                [customerId]
            );
            
            if (customerResult.rows.length === 0) {
                console.warn(`Attempting to delete non-existent customer: ID ${customerId}`);
                return 0;
            }

            const customerToDelete = customerResult.rows[0];
            let canDelete = false;
            
            if (deleteScope === 'created' && customerToDelete?.createdBy === deleter.id) {
                canDelete = true;
            } else if (deleteScope === 'assigned' && customerToDelete?.assignedTo === deleter.id) {
                canDelete = true;
            } else if (deleteScope === 'subordinates' && deleter.role === 'admin') {
                if (customerToDelete?.createdBy === deleter.id) {
                    canDelete = true;
                } else if (customerToDelete?.assignedTo) {
                    const subordinateCheck = await query(
                        'SELECT 1 FROM users WHERE id = $1 AND created_by_admin_id = $2', 
                        [customerToDelete.assignedTo, deleter.id]
                    );
                    if ((subordinateCheck.rowCount ?? 0) > 0) {
                        canDelete = true;
                    }
                }
            }

            if (!canDelete) {
                throw new Error(`Permission denied: You do not have permission to delete this specific customer based on scope '${deleteScope}'.`);
            }
        } catch (error) {
            if (error instanceof Error && error.message.startsWith('Permission denied')) {
                throw error;
            }
            console.error('Error fetching customer for permission check:', error);
            throw new Error('Failed to verify permissions or find customer for delete.');
        }
    }

    const sqlQuery = `
        DELETE FROM customers
        WHERE id = $1
    `;
    const params = [customerId];

    try {
        const result = await query(sqlQuery, params);
        return result.rowCount;
    } catch (error) {
        console.error('Error deleting customer:', error);
        throw error;
    }
};

export const assignCustomer = async (
    customerId: string,
    userIdToAssign: string | null,
    assigner: AuthenticatedUser
): Promise<Customer> => {
    // Permission Check
    if (!assigner.permissions?.assignCustomers) {
        throw new Error('Permission denied: You do not have permission to assign customers.');
    }

    // Validate userIdToAssign exists (or handle null for unassignment)
    if (userIdToAssign) {
        const userExists = await query('SELECT 1 FROM users WHERE id = $1', [userIdToAssign]);
        if (userExists.rowCount === 0) {
            throw new Error(`Assignee user with ID ${userIdToAssign} not found.`);
        }
    }

    // Update the customer's assigned_to field
    const sqlQuery = `
        UPDATE customers
        SET assigned_to = $1
        WHERE id = $2
        RETURNING id
    `;
    const params = [userIdToAssign, customerId];

    try {
        await query(sqlQuery, params);
        return getCustomerById(customerId);
    } catch (error) {
        console.error(`Error assigning customer ${customerId} to user ${userIdToAssign}:`, error);
        if (error instanceof Error && error.message.includes('not found')) {
            throw error;
        }
        throw new Error('Failed to assign customer in database.');
    }
};

export const getCustomerById = async (id: string): Promise<Customer | null> => {
    const sqlQuery = `
        SELECT 
            c.*,
            u.name as assigned_to_name,
            u.email as assigned_to_email,
            COALESCE(array_agg(DISTINCT cst.service_type) FILTER (WHERE cst.service_type IS NOT NULL), '{}') as service_types,
            COALESCE(
                json_agg(
                    DISTINCT jsonb_build_object(
                        'id', f.id,
                        'date', f.date,
                        'notes', f.notes,
                        'nextCallDate', f.next_call_date,
                        'leadId', f.lead_id,
                        'customerId', f.customer_id,
                        'createdBy', f.created_by
                    )
                ) FILTER (WHERE f.id IS NOT NULL), '[]'::json
            ) as "followUps",
            COALESCE(
                json_agg(
                    DISTINCT jsonb_build_object(
                        'id', rh.id,
                        'date', rh.date,
                        'amount', rh.amount,
                        'status', rh.status,
                        'notes', rh.notes,
                        'nextRenewalDate', rh.next_renewal_date
                    )
                ) FILTER (WHERE rh.id IS NOT NULL), '[]'::json
            ) as "renewalHistory"
        FROM customers c
        LEFT JOIN users u ON c.assigned_to = u.id
        LEFT JOIN customer_service_types cst ON c.id = cst.customer_id
        LEFT JOIN follow_ups f ON c.id = f.customer_id
        LEFT JOIN renewal_history rh ON c.id = rh.customer_id
        WHERE c.id = $1
        GROUP BY c.id, u.name, u.email
    `;

    try {
        const result = await getPool().query(sqlQuery, [id]);
        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            ...row,
            serviceTypes: row.service_types || [],
            followUps: row.followUps || [],
            renewalHistory: (row.renewalHistory || []).map(rh => ({
                ...rh,
                date: new Date(rh.date),
                nextRenewalDate: rh.nextRenewalDate ? new Date(rh.nextRenewalDate) : undefined
            })),
            assignedTo: row.assigned_to,
            startDate: new Date(row.start_date),
            createdAt: new Date(row.created_at),
            nextRenewal: row.next_renewal ? new Date(row.next_renewal) : undefined,
            nextReview: row.next_review ? new Date(row.next_review) : undefined,
            dob: row.dob ? new Date(row.dob) : undefined,
            engagementFlags: typeof row.engagement_flags === 'string' ? JSON.parse(row.engagement_flags) : (row.engagement_flags || { welcomeEmail: false, community: false, calls: false })
        };
    } catch (error) {
        console.error('Error fetching customer:', error);
        throw error;
    }
};