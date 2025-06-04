import { query, QueryParamValue } from '../db';

// --- Local Type Definitions ---
interface AuthenticatedUser {
  id: string;
  role: 'developer' | 'admin' | 'employee';
}

interface FollowUp {
  id: string;
  notes: string;
  nextCallDate: string; // ISO Date string
  userId: string;
  leadId?: string;
  customerId?: string;
  isCompleted: boolean;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
}

interface NewFollowUpData { // This type IS used by addFollowUp in this file, so keep it.
  notes: string;
  nextCallDate: string; // ISO Date string for input
  leadId?: string;
  customerId?: string;
}

interface FollowUpUpdateData {
  nextCallDate?: string; // ISO Date string for input
  notes?: string;
  isCompleted?: boolean;
}

// --- End Local Type Definitions ---

export const addFollowUp = async (
  followUpData: NewFollowUpData,
  creator: AuthenticatedUser
): Promise<FollowUp> => {
  const { notes, nextCallDate, leadId, customerId } = followUpData;

  if (!notes || !nextCallDate) {
    throw new Error('Notes and Next Call Date are required for follow-up.');
  }
  if (!leadId && !customerId) {
    throw new Error('Follow-up must be linked to either a lead or a customer.');
  }
  if (leadId && customerId) {
    throw new Error('Follow-up cannot be linked to both a lead and a customer.');
  }
  
  const creatorUserId = creator.id;

  const sqlQuery = `
    INSERT INTO follow_ups (date, notes, next_call_date, created_by, lead_id, customer_id, created_at, updated_at, is_completed)
    VALUES (NOW(), $1, $2, $3, $4, $5, NOW(), NOW(), false)
    RETURNING 
      id, notes, next_call_date, created_by, lead_id, customer_id, is_completed, created_at, updated_at;
  `;

  const params: QueryParamValue[] = [notes, nextCallDate, creatorUserId, leadId || null, customerId || null];

  try {
    const result = await query(sqlQuery, params);
    if (result.rows.length === 0) {
      throw new Error('Failed to create follow-up, no record returned.');
    }
    const row = result.rows[0];
    return {
      id: row.id,
      notes: row.notes,
      nextCallDate: new Date(row.next_call_date).toISOString(),
      userId: row.created_by,
      leadId: row.lead_id,
      customerId: row.customer_id,
      isCompleted: row.is_completed,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  } catch (error) {
    console.error('Error creating follow-up in database:', error);
    throw new Error('Failed to save follow-up to database.');
  }
};

export const deleteFollowUp = async (
  followUpId: string,
  deleter: AuthenticatedUser
): Promise<number> => {
  let followUpOwnerId: string | undefined;
  try {
    const selectResult = await query('SELECT created_by FROM follow_ups WHERE id = $1', [followUpId]);
    if (selectResult.rows.length === 0) {
      console.warn(`Follow-up with ID ${followUpId} not found for deletion.`);
      return 0; 
    }
    followUpOwnerId = selectResult.rows[0].created_by;
  } catch (error) {
    console.error(`Error fetching follow-up ${followUpId} for deletion check:`, error);
    throw new Error('Failed to retrieve follow-up details for deletion check.');
  }

  if (deleter.role !== 'admin' && deleter.role !== 'developer' && followUpOwnerId !== deleter.id) {
    throw new Error('Permission denied: You do not have permission to delete this follow-up.');
  }

  const deleteQuery = 'DELETE FROM follow_ups WHERE id = $1';
  try {
    const result = await query(deleteQuery, [followUpId]);
    return result.rowCount ?? 0;
  } catch (error) {
    console.error(`Error deleting follow-up ${followUpId} from database:`, error);
    throw new Error('Failed to delete follow-up from database.');
  }
};

export const updateFollowUp = async (
  followUpId: string, 
  data: FollowUpUpdateData,
  requestor: AuthenticatedUser
): Promise<FollowUp> => {
  let existingFollowUpOwnerId: string | undefined;
  try {
    const selectResult = await query('SELECT created_by FROM follow_ups WHERE id = $1', [followUpId]);
    if (selectResult.rows.length === 0) {
      throw new Error('Follow-up not found.');
    }
    existingFollowUpOwnerId = selectResult.rows[0].created_by;
  } catch (error) {
    console.error(`Error fetching follow-up ${followUpId} for update check:`, error);
    if (error instanceof Error && error.message === 'Follow-up not found.') throw error;
    throw new Error('Failed to retrieve follow-up details for update check.');
  }

  if (requestor.role !== 'admin' && requestor.role !== 'developer' && existingFollowUpOwnerId !== requestor.id) {
    throw new Error('Permission denied: You can only update your own follow-ups.');
  }

  const fieldsToUpdate: string[] = [];
  const values: QueryParamValue[] = []; 
  let paramIndex = 1;

  if (data.nextCallDate !== undefined) {
    fieldsToUpdate.push(`next_call_date = $${paramIndex++}`);
    values.push(data.nextCallDate);
  }
  if (data.notes !== undefined) {
    fieldsToUpdate.push(`notes = $${paramIndex++}`);
    values.push(data.notes);
  }
  if (data.isCompleted !== undefined) {
    fieldsToUpdate.push(`is_completed = $${paramIndex++}`);
    values.push(data.isCompleted);
  }

  if (fieldsToUpdate.length === 0) {
    const currentFollowUpResult = await query('SELECT id, notes, next_call_date, created_by, lead_id, customer_id, is_completed, created_at, updated_at FROM follow_ups WHERE id = $1', [followUpId]);
    if (currentFollowUpResult.rows.length === 0) throw new Error('Follow-up disappeared during update attempt.');
    const row = currentFollowUpResult.rows[0];
    return {
      id: row.id,
      notes: row.notes,
      nextCallDate: new Date(row.next_call_date).toISOString(),
      userId: row.created_by,
      leadId: row.lead_id,
      customerId: row.customer_id,
      isCompleted: row.is_completed,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  fieldsToUpdate.push(`updated_at = NOW()`);
  values.push(followUpId); 

  const updateQuery = `
    UPDATE follow_ups 
    SET ${fieldsToUpdate.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, notes, next_call_date, created_by, lead_id, customer_id, is_completed, created_at, updated_at;
  `;

  const result = await query(updateQuery, values);
  if (result.rows.length === 0) {
    throw new Error('Failed to update follow-up or follow-up not found after update attempt.');
  }
  const row = result.rows[0];
  return {
    id: row.id,
    notes: row.notes,
    nextCallDate: new Date(row.next_call_date).toISOString(),
    userId: row.created_by,
    leadId: row.lead_id,
    customerId: row.customer_id,
    isCompleted: row.is_completed,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
};