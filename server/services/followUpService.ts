import { query, QueryParamValue } from '../db';
// Remove the problematic import
// import { FollowUp } from '@/types'; 

// Define minimal FollowUp type locally
interface FollowUp {
  id: string;
  date: Date;
  notes: string;
  nextCallDate: Date; 
  leadId?: string; 
  customerId?: string;
  createdBy: string; 
}

// Define structure for user info passed from auth middleware
// (Should match other services)
interface AuthUserInfo {
  id: string;
  role: 'developer' | 'admin' | 'employee'; // Added role for permission checks
  // Add other relevant fields like permissions if needed for checks
}

// Type for the data needed to create a follow-up, excluding server-set fields
type FollowUpCreationData = Omit<FollowUp, 'id' | 'date'>; // Exclude id (generated) and date (default)

/**
 * Adds a new follow-up record to the database.
 * Links it to either a lead or a customer.
 * @param followUpData Data for the follow-up (notes, nextCallDate, leadId OR customerId).
 * @param creator User creating the follow-up.
 * @returns Promise resolving to the newly created FollowUp object.
 * @throws Error if both leadId and customerId are provided or missing, or on DB error.
 */
export const addFollowUp = async (
  followUpData: FollowUpCreationData,
  creator: AuthUserInfo
): Promise<FollowUp> => {
  const { notes, nextCallDate, leadId, customerId, createdBy } = followUpData;

  // --- Validation ---
  if (!notes || !nextCallDate) {
    throw new Error('Notes and Next Call Date are required for follow-up.');
  }
  if (!leadId && !customerId) {
    throw new Error('Follow-up must be linked to either a lead or a customer.');
  }
  if (leadId && customerId) {
    throw new Error('Follow-up cannot be linked to both a lead and a customer.');
  }
  
  // Use the creator's ID from the authenticated user info
  const finalCreatedBy = creator.id;

  // --- Database Insert ---
  const sqlQuery = `
    INSERT INTO follow_ups (date, notes, next_call_date, created_by, lead_id, customer_id)
    VALUES (NOW(), $1, $2, $3, $4, $5)
    RETURNING id, date, notes, next_call_date as "nextCallDate", created_by as "createdBy", lead_id as "leadId", customer_id as "customerId"
  `;

  const params: QueryParamValue[] = [
    notes,
    nextCallDate,
    finalCreatedBy,
    leadId || null, // Ensure null if undefined
    customerId || null // Ensure null if undefined
  ];

  try {
    const result = await query(sqlQuery, params);
    if (result.rows.length === 0) {
      throw new Error('Failed to create follow-up, no record returned.');
    }
    return result.rows[0] as FollowUp;
  } catch (error) {
    console.error('Error creating follow-up in database:', error);
    // Handle specific DB errors if necessary (e.g., foreign key violation)
    throw new Error('Failed to save follow-up to database.');
  }
};

/**
 * Deletes a follow-up record from the database.
 * @param followUpId The ID of the follow-up to delete.
 * @param deleter The user attempting to delete the follow-up.
 * @returns Promise resolving to the number of rows affected (0 or 1).
 * @throws Error if permission is denied or on DB error.
 */
export const deleteFollowUp = async (
  followUpId: string,
  deleter: AuthUserInfo
): Promise<number> => {
  // Fetch the follow-up to check ownership/permissions
  let followUpToDelete: FollowUp | undefined;
  try {
    const result = await query('SELECT * FROM follow_ups WHERE id = $1', [followUpId]);
    if (result.rows.length === 0) {
      // Follow-up not found, can be considered successfully "deleted" or throw an error
      console.warn(`Follow-up with ID ${followUpId} not found for deletion.`);
      return 0; // Or throw new Error('Follow-up not found');
    }
    followUpToDelete = result.rows[0] as FollowUp;
  } catch (error) {
    console.error(`Error fetching follow-up ${followUpId} for deletion:`, error);
    throw new Error('Failed to retrieve follow-up details for deletion.');
  }

  // Permission check:
  // - Developer/Admin can delete any.
  // - Employee can delete only if they created it.
  // More complex scenarios might involve checking if the employee is assigned to the parent lead/customer.
  let canDelete = false;
  if (deleter.role === 'developer' || deleter.role === 'admin') {
    canDelete = true;
  } else if (deleter.role === 'employee' && followUpToDelete.createdBy === deleter.id) {
    canDelete = true;
  }

  if (!canDelete) {
    throw new Error('Permission denied: You do not have permission to delete this follow-up.');
  }

  // --- Database Delete ---
  const sqlQuery = 'DELETE FROM follow_ups WHERE id = $1';
  const params: QueryParamValue[] = [followUpId];

  try {
    const result = await query(sqlQuery, params);
    return result.rowCount ?? 0;
  } catch (error) {
    console.error(`Error deleting follow-up ${followUpId} from database:`, error);
    throw new Error('Failed to delete follow-up from database.');
  }
};

// TODO: Add functions for retrieving follow-ups (e.g., getFollowUpsForLead, getFollowUpsForCustomer, getPendingFollowUpsByUser) 