import { query, QueryParamValue } from '../db';

// --- Local Type Definitions ---

// Assume Role and UserPermissions are defined or imported
// (Duplicating Role here for clarity if not imported)
type Role = 'developer' | 'admin' | 'employee';
interface UserPermissions { 
  [key: string]: unknown; 
  viewLeads?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none'; // Example relevant permission
  createLeads?: boolean;
  editLeads?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  deleteLeads?: 'all' | 'assigned' | 'created' | 'subordinates' | 'none';
  assignLeads?: boolean;
}

// Updated FollowUp interface to be comprehensive
interface FollowUp {
  id: string;
  date: Date; 
  notes: string;
  nextCallDate?: Date; 
  leadId?: string;
  customerId?: string;
  createdBy: string;
}

interface CommunicationRecord { id: string; /* other fields */ }

// Define Lead type for backend (align with DB schema and src/types)
// Consider creating a shared types package later
interface Lead {
  id: string;
  name: string;
  email: string;
  mobile: string;
  city: string;
  serviceTypes: string[];
  status: string;
  assignedTo?: string;
  createdBy?: string;
  createdAt: Date;
  aum?: number;
  company?: string;
  leadSource?: 'walk_in' | 'reference';
  referredBy?: string;
  lastWebinarDate?: Date;
  followUps?: FollowUp[];
  communicationHistory?: CommunicationRecord[];
}

// Update AuthUserInfo to use new Role and include permissions
interface AuthUserInfo {
  id: string;
  role: Role; // Use updated Role type
  permissions: UserPermissions; // Add permissions
}

// Helper function to sanitize lead data based on serviceTypes
const sanitizeLeadData = (data: Partial<Lead>, existingLead?: Lead): Partial<Lead> => {
    const serviceTypes = data.serviceTypes || existingLead?.serviceTypes;
    const sanitizedData = { ...data };

    if (!serviceTypes?.includes('training')) {
        // AUM is only for training leads
        sanitizedData.aum = undefined;
    }
    // Note: paymentType is not a lead field in this model

    return sanitizedData;
};

// --- Add this helper type ---
type UpdatableLeadFields = Omit<Lead, 'id' | 'createdAt' | 'followUps' | 'communicationHistory' | 'createdBy' | 'serviceTypes'>;
// --- End Add ---

/**
 * Fetches leads based on user role and permissions.
 */
export const getAllLeads = async (user: AuthUserInfo): Promise<Lead[]> => {
    // Base query - select all necessary fields and aggregate service types
    let sqlQuery = `
        SELECT 
            l.id, l.name, l.email, l.mobile, l.city, 
            l.status, l.assigned_to as "assignedTo", l.created_by as "createdBy", 
            l.created_at as "createdAt", l.aum, l.company, l.lead_source as "leadSource", 
            l.referred_by as "referredBy", l.last_webinar_date as "lastWebinarDate",
            COALESCE(array_agg(DISTINCT lst.service_type) FILTER (WHERE lst.service_type IS NOT NULL), '{}') as "serviceTypes",
            COALESCE(
                json_agg(
                    DISTINCT jsonb_build_object(
                        'id', f.id,
                        'date', f.date,
                        'notes', f.notes,
                        'nextCallDate', f.next_call_date, /* Ensure correct column name */
                        'leadId', f.lead_id,
                        'customerId', f.customer_id,
                        'createdBy', f.created_by
                    )
                ) FILTER (WHERE f.id IS NOT NULL), '[]'::json
            ) as "followUps"
        FROM leads l
        LEFT JOIN lead_service_types lst ON l.id = lst.lead_id
        LEFT JOIN follow_ups f ON l.id = f.lead_id
    `;
    const params: QueryParamValue[] = [];
    let paramIndex = 1;

    // Determine filtering based on role and permissions
    const viewScope = user.permissions?.viewLeads || 'none'; // Default to 'none' if undefined

    if (user.role === 'developer' || viewScope === 'all') {
        // Developer or user with 'all' permission sees everything - No WHERE clause needed for filtering scope
    } else if (user.role === 'admin') {
        // Admins filter based on their viewScope
        if (viewScope === 'created') {
            // See only leads created by this admin
            sqlQuery += ` WHERE l.created_by = $${paramIndex++}`;
            params.push(user.id);
        } else if (viewScope === 'subordinates') {
            // See leads created by this admin OR created by employees that this admin created
            sqlQuery += ` WHERE l.created_by = $${paramIndex} OR l.created_by IN (SELECT id FROM users WHERE created_by_admin_id = $${paramIndex})`;
            params.push(user.id);
            paramIndex++; // Increment index after using it twice
        } else if (viewScope === 'assigned') {
            // See only leads directly assigned to this admin
            sqlQuery += ` WHERE l.assigned_to = $${paramIndex++}`;
            params.push(user.id);
        } else {
            // Admin has 'none' or unexpected scope
            sqlQuery += ` WHERE 1=0`; // Return no results
        }
    } else if (user.role === 'employee') {
        // Employees can only see leads they created or are assigned to
        sqlQuery += ` WHERE l.created_by = $${paramIndex} OR l.assigned_to = $${paramIndex}`;
        params.push(user.id);
    }

    // Group by the primary key of the main table (leads)
    sqlQuery += ` GROUP BY l.id ORDER BY l.created_at DESC`;

    try {
        const result = await query(sqlQuery, params);
        // Define an interface for the row structure from the DB query
        interface DbLeadRow {
            id: string;
            name: string;
            email: string;
            mobile: string;
            city: string;
            status: string;
            assignedTo?: string;
            createdBy?: string;
            createdAt: string | Date; 
            aum?: number;
            company?: string;
            leadSource?: 'walk_in' | 'reference';
            referredBy?: string;
            lastWebinarDate?: string | Date;
            serviceTypes: string[];
            followUps: FollowUp[]; // Assuming pg driver parses json_agg into objects
            startDate?: string | Date;
        }

        return (result.rows as DbLeadRow[]).map((row: DbLeadRow) => ({
            ...row, 
            serviceTypes: row.serviceTypes || [], // Ensure not null
            followUps: row.followUps || [], // Ensure not null
            createdAt: new Date(row.createdAt),
            lastWebinarDate: row.lastWebinarDate ? new Date(row.lastWebinarDate) : undefined,
            startDate: row.startDate ? new Date(row.startDate) : undefined,
        }));
    } catch (error) {
        console.error('Error fetching leads:', error);
        throw error;
    }
};

/**
 * Creates a new lead in the database.
 * TODO: Add permission checks based on creator.permissions.createLeads
 */
export const createLead = async (
  leadData: Omit<Lead, 'id' | 'createdAt' | 'followUps' | 'communicationHistory' | 'createdBy'>, 
  creator: AuthUserInfo
): Promise<Lead> => {
  const { 
    name, email, mobile, city, serviceTypes, status,
    assignedTo, 
    aum, company, leadSource, referredBy, lastWebinarDate 
  } = leadData;

  // Permission check
  if (!creator.permissions?.createLeads) {
    throw new Error('Permission denied: Cannot create leads.');
  }

  // Sanitize data based on serviceTypes
  const sanitizedData = sanitizeLeadData(leadData);

  const {
    name: sanitizedName, email: sanitizedEmail, mobile: sanitizedMobile, city: sanitizedCity, 
    serviceTypes: sanitizedServiceTypes, status: sanitizedStatus,
    assignedTo: sanitizedAssignedTo,
    aum: sanitizedAum, company: sanitizedCompany, leadSource: sanitizedLeadSource, 
    referredBy: sanitizedReferredBy, lastWebinarDate: sanitizedLastWebinarDate
  } = sanitizedData;

  // Validation: AUM required for training
  if (sanitizedServiceTypes?.includes('training') && (sanitizedAum === undefined || sanitizedAum === null)) {
      throw new Error("AUM is required for service type 'training'.");
  }
  // Basic required field check
  if (!sanitizedName || !sanitizedEmail || !sanitizedMobile || !sanitizedServiceTypes?.length) {
      throw new Error("Missing required fields for lead creation.");
  }

  // Determine the assignee: if not specified, defaults to the creator.
  const finalAssignedTo = sanitizedAssignedTo || creator.id;
  const createdById = creator.id; // Track who created it

  console.log(`[LeadService] Creating lead. AssignedTo: ${finalAssignedTo}, CreatedBy: ${createdById}`);

  // Ensure status is valid or default
  const finalStatus = sanitizedStatus || 'new'; // Default status

  const sqlQuery = `
    WITH inserted_lead AS (
      INSERT INTO leads (
        name, email, mobile, city, status, assigned_to, created_by,
        aum, company, lead_source, referred_by, last_webinar_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 
        $8, $9, $10, $11, $12
      )
      RETURNING 
        id, name, email, mobile, city, 
        status, assigned_to as "assignedTo", created_by as "createdBy", 
        created_at as "createdAt"
    )
    INSERT INTO lead_service_types (lead_id, service_type)
    SELECT id, unnest($13::text[])
    FROM inserted_lead
    RETURNING lead_id;
  `;

  const params = [
    sanitizedName, sanitizedEmail, sanitizedMobile, sanitizedCity, finalStatus, finalAssignedTo, createdById,
    sanitizedAum, sanitizedCompany, sanitizedLeadSource, sanitizedReferredBy, sanitizedLastWebinarDate,
    sanitizedServiceTypes
  ];

  try {
    const result = await query(sqlQuery, params);
    if (result.rows.length === 0) {
      throw new Error('Failed to create lead, no record returned.');
    }
    
    // Fetch the complete lead with service types
    const leadId = result.rows[0].lead_id;
    const completeLead = await getLeadById(leadId);
    return completeLead;
  } catch (error) {
    console.error('Error creating lead:', error);
    throw new Error('Failed to create lead in database');
  }
};

/**
 * Updates an existing lead in the database.
 * TODO: Add permission checks based on updater role/permissions and lead ownership/assignment.
 */
export const updateLead = async (
  leadId: string,
  updateData: Partial<UpdatableLeadFields & { serviceTypes?: string[] }>, 
  updater: AuthUserInfo
): Promise<Lead> => {

  // --- Permission Check --- 
  const editScope = updater.permissions?.editLeads || 'none';
  
  if (editScope === 'none') {
    throw new Error('Permission denied: You do not have permission to edit leads.');
  }

  // Fetch basic info for permission check first
  let leadOwnerInfo: { createdBy?: string, assignedTo?: string } | undefined;
  try {
      const checkResult = await query(
          `SELECT created_by as "createdBy", assigned_to as "assignedTo"
           FROM leads WHERE id = $1`,
           [leadId]
      );
      if (checkResult.rows.length === 0) {
          throw new Error('Lead not found.');
      }
      leadOwnerInfo = checkResult.rows[0];
  } catch (fetchError) {
      console.error('Error fetching lead info for permission check:', fetchError);
      if (fetchError instanceof Error && fetchError.message === 'Lead not found.') throw fetchError;
      throw new Error('Failed to fetch lead information for permission check.');
  }
  
  // Perform permission logic based on scope
  if (editScope !== 'all') { 
      let canEdit = false;
      if (editScope === 'created' && leadOwnerInfo?.createdBy === updater.id) {
          canEdit = true;
      } else if (editScope === 'assigned' && leadOwnerInfo?.assignedTo === updater.id) {
          canEdit = true;
      } else if (editScope === 'subordinates' && updater.role === 'admin') {
          if (leadOwnerInfo?.createdBy === updater.id) {
              canEdit = true;
          } else if (leadOwnerInfo?.assignedTo) {
              // Check if assignedTo user is a subordinate
              try {
                  const subordinateCheck = await query(
                      'SELECT 1 FROM users WHERE id = $1 AND created_by_admin_id = $2', 
                      [leadOwnerInfo.assignedTo, updater.id]
                  );
                  if ((subordinateCheck.rowCount ?? 0) > 0) {
                      canEdit = true;
                  }
              } catch (subError) {
                  console.error('Error checking subordinate status:', subError);
                  // Decide if this error should block the update or not
              }
          }
      }

      if (!canEdit) {
          throw new Error(`Permission denied: You do not have permission to edit this specific lead based on scope '${editScope}'.`);
      }
  }
  // If editScope is 'all', no further checks needed here
  // --- End Permission Check ---

  // Now fetch the full existing lead data for sanitization and default values
  let existingLead: Lead | undefined;
  try {
    existingLead = await getLeadById(leadId);
  } catch(fetchError) {
     console.error('Error fetching full lead data after permission check:', fetchError);
     // Handle case where lead disappeared between checks - unlikely but possible
     if (fetchError instanceof Error && fetchError.message === 'Lead not found') {
        throw new Error('Lead not found after permission check.');
     }
     throw new Error('Failed to fetch lead data for update.');
  }

  // --- Revert Filtering Logic --- 
  const allowedUpdateFields = [
    'name', 'email', 'mobile', 'city', 'status', 'assignedTo', 
    'aum', 'company', 'leadSource', 'referredBy', 'lastWebinarDate'
  ] as const; 

  const filteredUpdateData: Partial<Lead> = {}; 
  for (const key of allowedUpdateFields) {
    // Revert back to simpler key access
    if (key in updateData) {
        const value = updateData[key]; 
        if (value !== undefined) {     
           // This assignment is valid because key is a known property of Lead
           // and value is confirmed to be non-undefined and of a compatible type.
           // TypeScript struggles with this pattern (assigning to Partial<T>[UnionKey]).
           // @ts-expect-error TS an overly strict interpretation of the assignability to filteredUpdateData[key]
           filteredUpdateData[key] = value;
        }
    }
  }
  // Handle serviceTypes separately if present in updateData
  if (updateData.serviceTypes) {
      filteredUpdateData.serviceTypes = updateData.serviceTypes;
  }
  // --- End Revert ---

  // Sanitize the filtered update data (no cast needed now)
  const sanitizedData = sanitizeLeadData(filteredUpdateData, existingLead);

  // Validate required fields after sanitization
  const finalServiceTypes = updateData.serviceTypes || existingLead?.serviceTypes || [];
  const finalAum = sanitizedData.aum !== undefined ? sanitizedData.aum : existingLead?.aum;
  if (finalServiceTypes?.includes('training') && (finalAum === undefined || finalAum === null)) {
      throw new Error("AUM is required for service type 'training'.");
  }

  // Prepare params for the main leads table update (excluding serviceTypes)
  const leadUpdateParams = [
      sanitizedData.name,
      sanitizedData.email,
      sanitizedData.mobile,
      sanitizedData.city,
      sanitizedData.status,
      sanitizedData.assignedTo,    // $6
      sanitizedData.aum !== undefined ? sanitizedData.aum : null, // $7
      sanitizedData.company,
      sanitizedData.leadSource,
      sanitizedData.referredBy,
      sanitizedData.lastWebinarDate, // $11
      leadId                         // $12
  ];

  const leadUpdateQuery = `
    UPDATE leads
    SET 
      name = COALESCE($1, name),
      email = COALESCE($2, email),
      mobile = COALESCE($3, mobile),
      city = COALESCE($4, city),
      status = COALESCE($5, status),
      assigned_to = COALESCE($6, assigned_to),
      aum = COALESCE($7, aum),
      company = COALESCE($8, company),
      lead_source = COALESCE($9, lead_source),
      referred_by = COALESCE($10, referred_by),
      last_webinar_date = COALESCE($11, last_webinar_date)
    WHERE id = $12
    RETURNING id; -- Return ID to confirm update
  `;

  try {
    // Step 1: Update the main leads table
    const updateResult = await query(leadUpdateQuery, leadUpdateParams);
    if (updateResult.rowCount === 0) {
        throw new Error('Failed to update lead record (lead not found or no changes detected).');
    }

    // Step 2: Update service types only if they were provided in the request
    if (updateData.serviceTypes !== undefined) {
        const serviceTypesToDelete = existingLead?.serviceTypes || [];
        const serviceTypesToInsert = updateData.serviceTypes;

        // Optimization: Only update if the list actually changed
        const typesChanged = JSON.stringify(serviceTypesToDelete.sort()) !== JSON.stringify(serviceTypesToInsert.sort());

        if (typesChanged) {
             // Step 2a: Delete existing service types for this lead
            await query(`DELETE FROM lead_service_types WHERE lead_id = $1`, [leadId]);

            // Step 2b: Insert the new service types if the array is not empty
            if (serviceTypesToInsert.length > 0) {
                await query(
                    `INSERT INTO lead_service_types (lead_id, service_type) SELECT $1, unnest($2::text[])`, 
                    [leadId, serviceTypesToInsert]
                );
            }
        }
    }

    // Step 3: Fetch and return the fully updated lead data
    return await getLeadById(leadId); 
  } catch (error) {
    console.error('Error updating lead:', error);
    // Check if it's a known DB error type (e.g., from pg)
    if (error instanceof Error && 'code' in error) {
      // Re-throw specific errors like not found, constraint violations, etc.
       if (error.code === '23503') { // foreign key violation
         throw new Error('Failed update due to related data constraint (e.g., invalid assignedTo ID).');
       }
       if (error.code === '22P02') { // invalid text representation (like the numeric error)
         throw new Error(`Failed update due to invalid data format: ${error.message}`);
       }
       // Add more specific DB error code handling if needed
    }
    // Generic fallback error
    throw new Error('Failed to update lead in database'); 
  }
};

/**
 * Deletes a lead from the database by its ID.
 * TODO: Add permission checks based on deleter role/permissions and lead ownership/assignment.
 */
export const deleteLead = async (
  leadId: string,
  deleter: AuthUserInfo
): Promise<number> => {

  // --- Permission Check --- 
  const deleteScope = deleter.permissions?.deleteLeads || 'none';
  
  if (deleteScope === 'none') {
    throw new Error('Permission denied: You do not have permission to delete leads.');
  }

  if (deleteScope !== 'all') { // Check ownership/assignment if scope is not 'all'
    try {
      const leadResult = await query('SELECT created_by as "createdBy", assigned_to as "assignedTo" FROM leads WHERE id = $1', [leadId]);
      if (leadResult.rows.length === 0) {
        // If lead doesn't exist, we can consider deletion successful (idempotent)
        // Or throw a 404? For now, let's allow the DELETE to proceed and return 0 rows affected.
        console.warn(`Attempting to delete non-existent lead: ID ${leadId}`); 
      } else { 
        const leadToDelete = leadResult.rows[0];
        let canDelete = false;
        
        if (deleteScope === 'created' && leadToDelete?.createdBy === deleter.id) {
          canDelete = true;
        } else if (deleteScope === 'assigned' && leadToDelete?.assignedTo === deleter.id) {
          canDelete = true;
        } else if (deleteScope === 'subordinates' && deleter.role === 'admin') {
          // Check if created by self OR assigned to a subordinate
          if (leadToDelete?.createdBy === deleter.id) {
            canDelete = true;
          } else if (leadToDelete?.assignedTo) {
            const subordinateCheck = await query(
              'SELECT 1 FROM users WHERE id = $1 AND created_by_admin_id = $2', 
              [leadToDelete.assignedTo, deleter.id]
            );
            if ((subordinateCheck.rowCount ?? 0) > 0) {
              canDelete = true;
            }
          }
        }

        if (!canDelete) {
           throw new Error(`Permission denied: You do not have permission to delete this specific lead based on scope '${deleteScope}'.`);
        }
      }

    } catch (error) {
      // Re-throw specific permission errors, otherwise handle as fetch error
      if (error instanceof Error && error.message.startsWith('Permission denied')) {
          throw error;
      }
      console.error('Error fetching lead for permission check:', error);
      throw new Error('Failed to verify permissions or find lead for delete.');
    }
  }
  // --- End Permission Check ---

  const sqlQuery = `
    DELETE FROM leads
    WHERE id = $1
  `;
  const params = [leadId];

  try {
    const result = await query(sqlQuery, params);
    if (result.rowCount === 0) {
      console.warn(`Attempted to delete non-existent lead or unauthorized: ID ${leadId}`);
    }
    return result.rowCount ?? 0;
  } catch (error) {
    console.error(`Error deleting lead with ID ${leadId}:`, error);
    throw new Error('Failed to delete lead from database');
  }
};

/**
 * Assigns a lead to a specific user.
 * @param leadId The ID of the lead to assign.
 * @param userIdToAssign The ID of the user to assign the lead to.
 * @param assigner The user performing the assignment action.
 * @returns Promise resolving to the updated Lead object.
 */
export const assignLead = async (
  leadId: string,
  userIdToAssign: string | null, // Allow unassigning by passing null
  assigner: AuthUserInfo
): Promise<Lead> => {
  // 1. Permission Check: Does the assigner have permission?
  if (!assigner.permissions?.assignLeads) {
    throw new Error('Permission denied: You do not have permission to assign leads.');
  }

  // 2. Optional: Validate userIdToAssign exists (or handle null for unassignment)
  if (userIdToAssign) {
    const userExists = await query('SELECT 1 FROM users WHERE id = $1', [userIdToAssign]);
    if (userExists.rowCount === 0) {
      throw new Error(`Assignee user with ID ${userIdToAssign} not found.`);
    }
  }

  // 3. Update the lead's assigned_to field
  const sqlQuery = `
    UPDATE leads
    SET assigned_to = $1
    WHERE id = $2
    RETURNING 
      id, name, email, mobile, city, 
      service_type as "serviceType", status, assigned_to as "assignedTo", 
      created_by as "createdBy", created_at as "createdAt", aum, company, 
      lead_source as "leadSource", referred_by as "referredBy", 
      last_webinar_date as "lastWebinarDate"
      -- Return all relevant fields
  `;
  const params = [userIdToAssign, leadId];

  try {
    await query(sqlQuery, params); // Execute the update
    return getLeadById(leadId); // Call the improved getLeadById to get the full updated lead
  } catch (error) {
    console.error(`Error assigning lead ${leadId} to user ${userIdToAssign}:`, error);
    // Re-throw specific errors if needed
    if (error instanceof Error && error.message.includes('not found')) {
        throw error; // Propagate user not found error
    }
    throw new Error('Failed to assign lead in database.');
  }
};

/**
 * Deletes ALL leads from the database.
 * Intended for admin use only (permission check done in route).
 * @returns Promise resolving to the number of leads deleted.
 */
export const deleteAllLeads = async (): Promise<number> => {
  const sqlQuery = `DELETE FROM leads`;
  try {
    const result = await query(sqlQuery, []);
    console.log(`Deleted ${result.rowCount ?? 0} leads.`);
    return result.rowCount ?? 0;
  } catch (error) {
    console.error('Error deleting all leads:', error);
    throw new Error('Failed to delete all leads from database');
  }
};

export const getLeadById = async (leadId: string): Promise<Lead> => {
  const sqlQuery = `
    SELECT
      l.id, l.name, l.email, l.mobile, l.city,
      l.status, l.assigned_to, l.created_by,
      l.created_at, l.aum, l.company, l.lead_source,
      l.referred_by, l.last_webinar_date,
      COALESCE(array_agg(DISTINCT lst.service_type) FILTER (WHERE lst.service_type IS NOT NULL), '{}') as "serviceTypes",
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
      ) as "followUps"
      -- communicationHistory is not explicitly joined here, assuming it might be handled elsewhere or is truly optional
    FROM
      leads l
    LEFT JOIN
      lead_service_types lst ON l.id = lst.lead_id
    LEFT JOIN
      follow_ups f ON l.id = f.lead_id
    WHERE
      l.id = $1
    GROUP BY
      l.id
  `;

  interface RawFollowUpFromDB {
    id: string;
    date: string | null; 
    notes: string | null;
    nextCallDate: string | null; 
    leadId?: string | null;
    customerId?: string | null;
    createdBy: string | null;
  }
  
  interface LeadWithAggregatesDbRow {
    id: string;
    name: string;
    email: string;
    mobile: string;
    city: string;
    status: string;
    assigned_to?: string; 
    created_by?: string;  
    created_at: string;    
    aum?: number;
    company?: string;
    lead_source?: 'walk_in' | 'reference';
    referred_by?: string;
    last_webinar_date?: string | null; 
    serviceTypes: string[]; 
    followUps: RawFollowUpFromDB[]; 
  }

  try {
    const result: { rows: LeadWithAggregatesDbRow[] } = await query(sqlQuery, [leadId]);

    if (result.rows.length === 0) {
      throw new Error('Lead not found');
    }
    const dbRow: LeadWithAggregatesDbRow = result.rows[0];

    return {
      id: dbRow.id,
      name: dbRow.name,
      email: dbRow.email,
      mobile: dbRow.mobile,
      city: dbRow.city,
      serviceTypes: dbRow.serviceTypes || [],
      status: dbRow.status,
      assignedTo: dbRow.assigned_to,
      createdBy: dbRow.created_by,
      createdAt: new Date(dbRow.created_at),
      aum: dbRow.aum,
      company: dbRow.company,
      leadSource: dbRow.lead_source,
      referredBy: dbRow.referred_by,
      lastWebinarDate: dbRow.last_webinar_date ? new Date(dbRow.last_webinar_date) : undefined,
      followUps: (dbRow.followUps || []).map((fu: RawFollowUpFromDB): FollowUp => ({
        id: fu.id,
        notes: fu.notes || '',
        leadId: fu.leadId || undefined,
        customerId: fu.customerId || undefined,
        createdBy: fu.createdBy || '',
        date: fu.date ? new Date(fu.date) : new Date(), 
        nextCallDate: fu.nextCallDate ? new Date(fu.nextCallDate) : undefined,
      })),
      communicationHistory: [], 
    } as Lead;
  } catch (error) {
    console.error(`Error fetching lead by ID ${leadId}:`, error);
    if (error instanceof Error && error.message === 'Lead not found') {
        throw error;
    }
    throw new Error('Failed to fetch lead from database');
  }
};

// TODO: Add other lead service functions (getById) 
// Ensure this comment is not removing the closing curly brace of the module or any other relevant code.