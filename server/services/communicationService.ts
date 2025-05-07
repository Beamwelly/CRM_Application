import { query, QueryParamValue } from '../db';
import fs from 'fs/promises'; // Import fs promises API
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
// Removed problematic imports
// import { CommunicationRecord } from '../../src/types'; 
// import { AuthUserInfo } from './userService'; 

// --- Local Type Definitions --- 

// Combined type for history entries - RENAME this to CommunicationRecord
// as it now represents the single source table
export interface CommunicationRecord {
  id: string;
  // Merged types from both interfaces
  type: 'call' | 'email' | 'meeting' | 'other' | 'remark'; 
  date: Date;
  createdBy: string; // User ID
  leadId?: string | number;
  customerId?: string | number;
  relatedFollowUpId?: string; // Added from the first interface
  // Call specific
  notes?: string; // Used for call notes OR remark text
  duration?: number; 
  callStatus?: 'completed' | 'missed' | 'cancelled';
  recordingUrl?: string;
  // Email specific
  emailSubject?: string;
  emailBody?: string;
  // Remark specific
  remarkText?: string; // Keep for frontend clarity when ADDING, but store in notes
}

// Define types locally if not imported
type Role = 'developer' | 'admin' | 'employee';
interface UserPermissions { 
  [key: string]: unknown; 
  addCommunications?: boolean; // Example relevant permission
  viewCommunications?: 'all' | 'assignedContacts' | 'created' | 'none';
}

// Update AuthUserInfo to use new Role and include permissions
interface AuthUserInfo {
  id: string;
  role: Role; // Use updated Role type
  permissions: UserPermissions; // Add permissions
}

// Simplified type for creation (adjust based on actual CommunicationRecord)
// Note: recordingUrl is removed, recordingData is added
type CreateCommunicationData = Omit<CommunicationRecord, 'id' | 'date' | 'recordingUrl'> & { recordingData?: string }; // Expect string from frontend

// Type for unified creation payload
type CreateCommunicationPayload = {
  type: 'call' | 'email' | 'remark';
  notes?: string; // Call notes or Remark text
  leadId?: string | number;
  customerId?: string | number;
  // Call specific
  duration?: number;
  callStatus?: 'completed' | 'missed' | 'cancelled';
  recordingData?: string; // Base64 data for calls
  // Email specific
  emailSubject?: string;
  emailBody?: string;
}; 

// --- Helper Function to Save Recording ---
const saveRecording = async (base64Data: string): Promise<string> => {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `${uuidv4()}.wav`; // Generate unique filename
    // Ensure the uploads directory exists (relative to dist/server/services)
    const uploadsDir = path.join(__dirname, '../../../uploads/recordings'); 
    await fs.mkdir(uploadsDir, { recursive: true }); // Create directory if it doesn't exist
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);
    
    // ---> ADD VERIFICATION STEP <---
    try {
        await fs.access(filePath, fs.constants.F_OK); // Check if file exists
        console.log(`[CommService] VERIFIED file exists at: ${filePath}`);
    } catch (verifyError) {
        console.error(`[CommService] CRITICAL: File written to ${filePath} but cannot be accessed immediately!`, verifyError);
        // Optionally, re-throw or handle this critical failure
        throw new Error('File written but verification failed.');
    }
    // ---> END VERIFICATION STEP <---
    
    // Return a URL path relative to the server root for storage/retrieval
    // This path will be used later to construct a serving URL
    const relativeUrl = `/uploads/recordings/${filename}`;
    console.log(`Recording saved to: ${filePath}, URL path: ${relativeUrl}`);
    return relativeUrl;
  } catch (error) {
    console.error("Error saving recording file:", error);
    throw new Error('Failed to save recording file.'); // Propagate error
  }
};

/**
 * Creates a new communication record (call, email, or remark) in the database.
 */
export const createCommunicationRecord = async (
  recordData: CreateCommunicationPayload, 
  creator: AuthUserInfo
): Promise<CommunicationRecord> => {
  // Log the incoming data immediately
  console.log('[CommService] createCommunicationRecord received data:', JSON.stringify(recordData)); 
  console.log('[CommService] Creator:', creator);

  const { 
    type, notes, 
    leadId, customerId, duration, callStatus, recordingData, // Call/Remark fields
    emailSubject, emailBody // Email fields
  } = recordData;

  // Basic permission check (can be refined per type if needed)
  if (!creator.permissions?.addCommunications) {
      throw new Error('Permission denied: Cannot add communication records.');
  }

  const finalCreatedBy = creator.id; 
  let recordingUrl: string | null = null;
  let finalRemarkText: string | null = null;
  let finalNotes: string | null = notes || null;

  if (type === 'remark') {
    finalRemarkText = notes || null; // Store remark text in specific column
    finalNotes = null; // Clear notes field if it was a remark
  } else if (type === 'call' && recordingData) {
    // Log the condition check
    console.log(`[CommService] Condition check: type=${type}, recordingData provided? ${!!recordingData}`);
    // Log a snippet of recordingData if it exists
    if (recordingData) {
        console.log(`[CommService] recordingData starts with: ${recordingData.substring(0, 30)}...`);
    }
    try {
      console.log('[CommService] Attempting to save recording...'); // Add log before trying
      recordingUrl = await saveRecording(recordingData);
      console.log(`[CommService] Recording URL set to: ${recordingUrl}`); // Add log on success
    } catch (error) {
      console.error("[CommService] CRITICAL: Failed to save recording file:", error);
      // Re-throw the error to prevent proceeding with DB insert if file save failed
      throw new Error('Failed to save recording file, aborting communication record creation.'); 
    }
  }

  const sqlQuery = `
    INSERT INTO communication_records (
      type, notes, made_by, remark_text, -- added remark_text
      lead_id, customer_id, duration, call_status, recording_url,
      email_subject, email_body,
      date
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
      NOW()
    )
    RETURNING 
      id, type, notes, 
      made_by as "createdBy",
      lead_id as "leadId", customer_id as "customerId",
      duration, call_status as "callStatus", recording_url as "recordingUrl",
      email_subject as "emailSubject", email_body as "emailBody",
      remark_text as "remarkText", -- return remark_text
      date
  `;

  const params: QueryParamValue[] = [
    type, finalNotes, finalCreatedBy, finalRemarkText, // pass remark_text
    leadId, customerId, duration, callStatus, recordingUrl,
    emailSubject, emailBody
  ];

  try {
    const result = await query(sqlQuery, params);
    if (result.rows.length === 0) {
      throw new Error('Failed to create communication record, no record returned.');
    }
    // Map remark_text back to notes if type is remark for consistent return type
    const record = result.rows[0];
    if (record.type === 'remark') {
        record.notes = record.remarkText;
    }
    // Add logging here to confirm successful creation and see the returned record
    console.log('[CommService] Successfully created communication record:', record);
    return record as CommunicationRecord; 
  } catch (error) {
    console.error('Error creating communication record in database service:', error);
    throw new Error('Failed to create communication record in database'); 
  }
};

/**
 * Fetches unified communication history (calls, emails, remarks) from a single table.
 */
export const getCommunicationHistory = async (user: AuthUserInfo, entityId?: string | number): Promise<CommunicationRecord[]> => {
  const viewScope = user.permissions?.viewCommunications || 'none';
  console.log(`[CommService] getCommunicationHistory - User: ${user.id}, Role: ${user.role}, Scope: ${viewScope}, EntityId: ${entityId}`);

  if (viewScope === 'none') {
    console.log(`[CommService] Permission denied (scope: none) for user ${user.id}.`);
    return [];
  }

  let sqlQuery = `
    SELECT 
      id, type, 
      CASE 
        WHEN type = 'remark' THEN remark_text 
        ELSE notes 
      END as notes, 
      made_by as "createdBy", lead_id as "leadId", customer_id as "customerId",
      duration, call_status as "callStatus", recording_url as "recordingUrl",
      email_subject as "emailSubject", email_body as "emailBody",
      remark_text as "remarkText",
      date
    FROM communication_records
  `;
  
  const params: QueryParamValue[] = [];
  let paramIndex = 1;
  const whereClauses: string[] = []; // Use an array for multiple conditions

  // Build WHERE clause based on entityId or scope
  if (entityId) {
    // Ensure entityId is treated correctly if it can be UUID or INT
    whereClauses.push(` (lead_id::text = $${paramIndex} OR customer_id::text = $${paramIndex})`);
    params.push(String(entityId));
    paramIndex++;
  } else {
    // Build WHERE clause based on scope
    if (user.role === 'developer' || viewScope === 'all') {
       // No user-specific scope filter needed
    } else if (user.role === 'admin') {
       if (viewScope === 'created') {
          whereClauses.push(` made_by = $${paramIndex++}`);
          params.push(user.id);
       } else if (viewScope === 'assignedContacts') {
          // Fetch history for leads/customers assigned to the admin OR their subordinates
          whereClauses.push(` 
            (lead_id IN (
              SELECT id FROM leads WHERE assigned_to = $${paramIndex} 
              OR assigned_to IN (SELECT id FROM users WHERE created_by_admin_id = $${paramIndex})
            ) OR customer_id IN (
              SELECT id FROM customers WHERE assigned_to = $${paramIndex}
              OR assigned_to IN (SELECT id FROM users WHERE created_by_admin_id = $${paramIndex})
            ))
          `);
          params.push(user.id);
          paramIndex++; // Increment only once for the block
       } else {
         console.log(`[CommService] Invalid scope '${viewScope}' for admin ${user.id}. Returning empty.`);
         return []; // Invalid scope
       }
    } else if (user.role === 'employee') {
       if (viewScope === 'created') {
          whereClauses.push(` made_by = $${paramIndex++}`);
          params.push(user.id);
       } else if (viewScope === 'assignedContacts') {
          // Fetch history for leads/customers assigned to the employee
          whereClauses.push(` (lead_id IN (SELECT id FROM leads WHERE assigned_to = $${paramIndex}) OR customer_id IN (SELECT id FROM customers WHERE assigned_to = $${paramIndex}))`);
          params.push(user.id);
          paramIndex++;
       } else {
         console.log(`[CommService] Invalid scope '${viewScope}' for employee ${user.id}. Returning empty.`);
         return []; // Invalid scope
       }
    }
  }

  // Combine WHERE clauses
  if (whereClauses.length > 0) {
      sqlQuery += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  sqlQuery += ` ORDER BY date DESC`; // Add sorting

  console.log("[CommService] Executing query:", sqlQuery);
  console.log("[CommService] Query params:", params);

  try {
    const result = await query(sqlQuery, params);
    return result.rows as CommunicationRecord[];
  } catch (error) {
    console.error('Error fetching communication history:', error);
    throw new Error('Failed to fetch communication history');
  }
};

// --- New Function for Sent Emails --- 
export const getSentEmails = async (user: AuthUserInfo): Promise<CommunicationRecord[]> => {
  const viewScope = user.permissions?.viewCommunications || 'none';
  console.log(`[CommService] getSentEmails - User: ${user.id}, Role: ${user.role}, Scope: ${viewScope}`);

  if (viewScope === 'none') {
    console.log(`[CommService] Permission denied (scope: none) for user ${user.id}.`);
    return [];
  }

  let sqlQuery = `
    SELECT 
      cr.id, cr.type, cr.notes, cr.made_by as "createdBy", 
      cr.lead_id as "leadId", cr.customer_id as "customerId",
      cr.duration, cr.call_status as "callStatus", cr.recording_url as "recordingUrl",
      cr.email_subject as "emailSubject", cr.email_body as "emailBody", 
      cr.remark_text as "remarkText",
      cr.date,
      -- Add recipient details based on joins
      COALESCE(l.name, c.name) as "recipientName", 
      COALESCE(l.email, c.email) as "recipientEmail" 
    FROM communication_records cr 
    LEFT JOIN leads l ON cr.lead_id = l.id
    LEFT JOIN customers c ON cr.customer_id = c.id
    WHERE cr.type = 'email'
  `; 
  
  const params: QueryParamValue[] = [];
  let paramIndex = 1;
  const whereClauses: string[] = []; 

  // Add scope-based filtering similar to getCommunicationHistory
  if (user.role === 'developer' || viewScope === 'all') {
    // No additional user-specific scope filter needed
  } else if (user.role === 'admin') {
    if (viewScope === 'created') {
       whereClauses.push(` cr.made_by = $${paramIndex++}`); // Use alias
       params.push(user.id);
    } else if (viewScope === 'assignedContacts') {
       whereClauses.push(` 
         (cr.lead_id IN (
           SELECT id FROM leads WHERE assigned_to = $${paramIndex} 
           OR assigned_to IN (SELECT id FROM users WHERE created_by_admin_id = $${paramIndex})
         ) OR cr.customer_id IN (
           SELECT id FROM customers WHERE assigned_to = $${paramIndex}
           OR assigned_to IN (SELECT id FROM users WHERE created_by_admin_id = $${paramIndex})
         ))
       `);
       params.push(user.id);
       paramIndex++;
    } else {
      return []; // Invalid scope
    }
  } else if (user.role === 'employee') {
    if (viewScope === 'created') {
       whereClauses.push(` cr.made_by = $${paramIndex++}`); // Use alias
       params.push(user.id);
    } else if (viewScope === 'assignedContacts') {
       whereClauses.push(` (cr.lead_id IN (SELECT id FROM leads WHERE assigned_to = $${paramIndex}) OR cr.customer_id IN (SELECT id FROM customers WHERE assigned_to = $${paramIndex}))`);
       params.push(user.id);
       paramIndex++;
    } else {
      return []; // Invalid scope
    }
  }

  // Combine additional WHERE clauses with the initial type filter
  if (whereClauses.length > 0) {
      sqlQuery += ` AND (${whereClauses.join(' AND ')})`; // Add AND
  }

  sqlQuery += ` ORDER BY cr.date DESC`; // Use alias

  console.log("[CommService] Executing query getSentEmails:", sqlQuery);
  console.log("[CommService] Query params getSentEmails:", params);

  try {
    const result = await query(sqlQuery, params);
    // Map the result, ensuring the new fields are included
    return result.rows.map(row => ({
        ...row,
        // Ensure boolean fields etc. are correctly typed if needed, 
        // but direct selection often works.
    })) as CommunicationRecord[];
  } catch (error) {
    console.error('Error fetching sent emails:', error);
    throw new Error('Failed to fetch sent emails');
  }
};
// --- End New Function ---

/**
 * Gets the file path for a specific recording ID.
 * Includes permission checks.
 */
export const getRecordingFilePath = async (recordingId: string, user: AuthUserInfo): Promise<string | null> => {
  // 1. Fetch the recording URL from the database
  const result = await query('SELECT recording_url FROM communication_records WHERE id = $1', [recordingId]);
  if (result.rows.length === 0 || !result.rows[0].recording_url) {
    return null; // Not found or no URL
  }
  const relativeUrl = result.rows[0].recording_url;

  // 2. Permission Check (Example: Can the user play recordings?)
  // This requires knowing if the record belongs to an entity the user can access
  // For simplicity now, let's assume if they can fetch history, they can access recordings *if* they have playRecordings permission.
  // A more robust check would involve fetching the full record and checking access scope.
  if (!user.permissions?.playRecordings) {
      console.warn(`User ${user.id} attempted to access recording ${recordingId} without playRecordings permission.`);
      // throw new Error('Permission denied: Cannot play recordings.'); // Or just return null
      return null;
  }
  
  // 3. Construct the full file path
  // Path is relative to the *running* JS file (dist/server/services)
  const filePath = path.join(__dirname, '../../..', relativeUrl);
  
  // 4. Verify file exists (optional but good practice)
  try {
    await fs.access(filePath); 
    return filePath;
  } catch (error) {
    console.error(`Recording file not found at path: ${filePath} (URL: ${relativeUrl})`);
    return null;
  }
};

// Potentially remove addCallRecordingToRecord if it existed and is no longer needed

// Export other necessary functions... 