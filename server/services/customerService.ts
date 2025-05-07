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
    LEFT JOIN renewal_history rh ON c.id = rh.customer_id -- Added join for renewal history
  `;

  const params: QueryParamValue[] = [];
  let paramIndex = 1; // Start param index at 1

  // WHERE clause construction based on role/permissions
  const whereClauses: string[] = [];

  // --- Handle target admin filter for developers ---
  if (user.role === 'developer' && targetAdminId) {
    console.log(`[customerService] Developer filtering for admin: ${targetAdminId}`);
    
    const employeesResult = await query('SELECT id FROM users WHERE created_by_admin_id = $1', [targetAdminId]);
    const employeeIds = employeesResult.rows.map(row => row.id);
    const relevantUserIds = [targetAdminId, ...employeeIds]; // Target admin + their employees
    
    if (relevantUserIds.length > 0) {
      const placeholders = relevantUserIds.map((_, idx) => `$${paramIndex + idx}`).join(', ');
      whereClauses.push(`(c.created_by IN (${placeholders}) OR c.assigned_to IN (${placeholders}))`);
      params.push(...relevantUserIds);
      paramIndex += relevantUserIds.length;
    } else {
      whereClauses.push(`(c.created_by = $${paramIndex} OR c.assigned_to = $${paramIndex})`);
      params.push(targetAdminId);
      paramIndex++;
    }
  }
  else if (user.role === 'employee') {
    whereClauses.push(`(c.assigned_to = $${paramIndex} OR c.created_by = $${paramIndex})`);
    params.push(user.id);
    paramIndex++;
  } else if (user.role === 'admin') {
    const viewScope = user.permissions?.viewCustomers || 'none';
    if (viewScope === 'assigned') {
      whereClauses.push(`c.assigned_to = $${paramIndex++}`);
      params.push(user.id);
    } else if (viewScope === 'created') {
      whereClauses.push(`c.created_by = $${paramIndex++}`);
      params.push(user.id);
    } else if (viewScope === 'subordinates') {
        whereClauses.push(`(
            c.created_by = $${paramIndex} OR 
            c.assigned_to = $${paramIndex} OR
            c.assigned_to IN (SELECT id FROM users WHERE created_by_admin_id = $${paramIndex})
        )`);
        params.push(user.id);
        paramIndex++;
    } else if (viewScope !== 'all') {
         whereClauses.push('1=0');
    }
  }

  if (whereClauses.length > 0) {
      sqlQuery += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  // Group by the primary key of the main table (customers)
  // and other non-aggregated selected columns from joined tables
  sqlQuery += ` 
    GROUP BY c.id, u.name, u.email 
    ORDER BY c.created_at DESC
  `;

  // Define an interface for the row structure from the DB query
  interface DbCustomerRow {
    // All fields from customers c.*, plus assigned_to_name, assigned_to_email
    id: string;
    name: string;
    email: string;
    mobile: string;
    city: string;
    status: string;
    assigned_to: string;
    start_date: string | Date;
    created_at: string | Date;
    created_by?: string;
    lead_id?: string;
    payment_type?: string;
    payment_status?: 'completed' | 'not_completed';
    aum?: number;
    next_renewal?: string | Date;
    next_review?: string | Date;
    review_remarks?: string;
    batch_no?: string;
    dob?: string | Date;
    address?: string;
    company?: string;
    engagement_flags?: EngagementFlags;
    assigned_to_name?: string;
    assigned_to_email?: string;
    service_types: string[]; // from array_agg
    followUps: FollowUp[]; // from json_agg, assuming pg driver parses
    renewalHistory: RenewalHistory[]; // Added renewal history
  }

  try {
    const result = await query(sqlQuery, params);
    return (result.rows as DbCustomerRow[]).map((row: DbCustomerRow) => ({
      ...row,
      serviceTypes: row.service_types || [], 
      followUps: row.followUps || [], // Ensure not null from json_agg
      renewalHistory: (row.renewalHistory || []).map(rh => ({ // Ensure dates are parsed correctly
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
      // engagementFlags is tricky, if it's a JSON string from DB, it needs parsing
      // Assuming it's already an object or the original handling was sufficient
      engagementFlags: typeof row.engagement_flags === 'string' ? JSON.parse(row.engagement_flags) : (row.engagement_flags || { welcomeEmail: false, community: false, calls: false }) as EngagementFlags
    }));
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};

export const createCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'createdBy' | 'followUps'>, creatorId: string): Promise<Customer> => {
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
        JSON.stringify(engagementFlags || { welcomeEmail: false, community: false, calls: false }),
        creatorId,
        serviceTypes
    ];

    try {
        const result = await getPool().query(insertCustomerQuery, customerParams);
        return await getCustomerById(result.rows[0].customer_id);
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

    console.log('[Backend updateCustomer] ID:', id);
    console.log('[Backend updateCustomer] updateData (original from frontend slice):', JSON.stringify(updateData, null, 2));
    console.log('[Backend updateCustomer] otherUpdateData (after destructuring serviceTypes):', JSON.stringify(otherUpdateData, null, 2));
    console.log('[Backend updateCustomer] customerSetClauses:', customerSetClauses);
    console.log('[Backend updateCustomer] customerParams (values for SET):', JSON.stringify(customerParams.slice(0, -1), null, 2)); // Log params excluding the ID

    const updateCustomerQuery = `
        UPDATE customers
        SET ${customerSetClauses}
        WHERE id = $${customerParamIndex}
        RETURNING id;
    `;

    try {
        if (customerSetClauses.length > 0) {
          console.log(`[updateCustomer] Updating customer ${id} with params:`, customerParams);
          const updateResult = await getPool().query(updateCustomerQuery, customerParams);
          if (updateResult.rowCount === 0) {
              console.warn(`Customer ${id} not found or no changes applied to main table.`);
          }
        }

        if (serviceTypes !== undefined) { 
            console.log(`[updateCustomer] Updating service types for ${id}:`, serviceTypes);
            await getPool().query(`DELETE FROM customer_service_types WHERE customer_id = $1`, [id]);

            if (serviceTypes.length > 0) {
                const insertServiceTypesQuery = `
                    INSERT INTO customer_service_types (customer_id, service_type)
                    SELECT $1, unnest($2::text[])
                `;
                await getPool().query(insertServiceTypesQuery, [id, serviceTypes]);
            }
             console.log(`[updateCustomer] Service types updated for ${id}.`);
        } else {
             console.log(`[updateCustomer] No service types provided for update on ${id}. Skipping.`);
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
  try {
    console.log('Deleting customer:', customerId);

  const sqlQuery = `
    DELETE FROM customers
    WHERE id = $1
      RETURNING id
    `;

    const result = await query(sqlQuery, [customerId]);
    
    if (result.rows.length === 0) {
      throw new Error('Customer not found');
    }

    console.log('Customer deleted successfully:', customerId);
    return 1;
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};

export const deleteAllCustomers = async (): Promise<number> => {
  try {
    console.log('Deleting all customers');

    const sqlQuery = `
      DELETE FROM customers
      RETURNING id
    `;

    const result = await query(sqlQuery);
    
    console.log('All customers deleted successfully');
    return result.rows.length;
  } catch (error) {
    console.error('Error deleting all customers:', error);
    throw error;
  }
};

export const getCustomerById = async (id: string): Promise<Customer> => {
    const sqlQuery = `
        SELECT 
            c.*,
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
        LEFT JOIN customer_service_types cst ON c.id = cst.customer_id
        LEFT JOIN follow_ups f ON c.id = f.customer_id
        LEFT JOIN renewal_history rh ON c.id = rh.customer_id -- Added join for renewal history
        WHERE c.id = $1
        GROUP BY c.id
    `;

    // Define DbCustomerRow for getCustomerById as well, or ensure consistency
    interface DbSingleCustomerRow {
        id: string;
        name: string;
        email: string;
        mobile: string;
        city: string;
        status: string;
        assigned_to: string;
        start_date: string | Date;
        created_at: string | Date;
        created_by?: string;
        lead_id?: string;
        payment_type?: string;
        payment_status?: 'completed' | 'not_completed';
        aum?: number;
        next_renewal?: string | Date;
        next_review?: string | Date;
        review_remarks?: string;
        batch_no?: string;
        dob?: string | Date;
        address?: string;
        company?: string;
        engagement_flags?: EngagementFlags;
        service_types: string[];
        followUps: FollowUp[];
        renewalHistory: RenewalHistory[]; // Added renewal history
      }

    try {
        const result = await getPool().query(sqlQuery, [id]);
        if (result.rows.length === 0) {
            throw new Error('Customer not found');
        }

        const row = result.rows[0] as DbSingleCustomerRow;
        return {
            ...row,
            serviceTypes: row.service_types || [],
            followUps: row.followUps || [],
            renewalHistory: (row.renewalHistory || []).map(rh => ({ // Ensure dates are parsed correctly
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
            engagementFlags: typeof row.engagement_flags === 'string' ? JSON.parse(row.engagement_flags) : (row.engagement_flags || { welcomeEmail: false, community: false, calls: false }) as EngagementFlags
        };
    } catch (error) {
        console.error('Error fetching customer:', error);
        throw error;
    }
};

// --- Add Renewal History Entry --- 
export const addRenewalHistoryEntry = async (
  customerId: string,
  renewalData: Omit<RenewalHistory, 'id' | 'date'>, // Input excludes id/date
  creator: AuthenticatedUser // Assuming creator info is needed
): Promise<RenewalHistory> => {
  const { amount, status, notes, nextRenewalDate } = renewalData;

  // Basic validation
  if (!customerId || !status || !nextRenewalDate) {
    throw new Error('Missing required fields for renewal history entry.');
  }

  const sqlQuery = `
    INSERT INTO renewal_history (customer_id, date, amount, status, notes, next_renewal_date)
    VALUES ($1, NOW(), $2, $3, $4, $5)
    RETURNING id, date, amount, status, notes, next_renewal_date as "nextRenewalDate"
  `;

  const params: QueryParamValue[] = [
    customerId,
    amount ?? null, // Handle optional amount
    status,
    notes ?? null,
    nextRenewalDate,
    // creator.id // Removed creator.id as created_by column doesn't exist
  ];

  try {
    const result = await query(sqlQuery, params);
    if (result.rows.length === 0) {
      throw new Error('Failed to add renewal history, no record returned.');
    }
    // Parse dates before returning
    const newEntry = result.rows[0];
    return {
      ...newEntry,
      date: new Date(newEntry.date),
      nextRenewalDate: newEntry.nextRenewalDate ? new Date(newEntry.nextRenewalDate) : undefined,
    } as RenewalHistory;
  } catch (error) {
    console.error('Error adding renewal history entry to database:', error);
    throw new Error('Failed to save renewal history entry to database.');
  }
};
// --- End Add Renewal History Entry ---