import { query, QueryParamValue } from '../db';
import fs from 'fs/promises'; // Import fs promises API
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
// Removed problematic imports
// import { CommunicationRecord } from '../../src/types'; 
// import { AuthUserInfo } from './userService'; 

// --- Local Type Definitions --- 

// Combined type for history entries - RENAME this to CommunicationRecord
// as it now represents the single source table
export interface CommunicationRecord {
  id: string;
  // Merged types from both interfaces
  type: 'call' | 'meeting' | 'other' | 'remark'; 
  date: Date;
  createdBy: string; // User ID
  leadId?: string | number;
  customerId?: string | number;
  relatedFollowUpId?: string; // Added from the first interface
  // Call specific
  notes?: string; // Used for call notes OR remark text
  duration?: number; 
  recordingUrl?: string;
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
export interface AuthUserInfo {
  id: string;
  role: Role; // Use updated Role type
  permissions: UserPermissions; // Add permissions
}

// Simplified type for creation (adjust based on actual CommunicationRecord)
// Note: recordingUrl is removed, recordingData is added
type CreateCommunicationData = Omit<CommunicationRecord, 'id' | 'date' | 'recordingUrl'> & { recordingData?: string }; // Expect string from frontend

// Type for unified creation payload
type CreateCommunicationPayload = {
  type: 'call' | 'meeting' | 'other' | 'remark';
  notes?: string;
  remark_text?: string;
  lead_id?: string | number;
  customer_id?: string | number;
  duration?: number;
  recording_data?: string;
}; 

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false // Only use this in development
  }
});

// Verify transporter configuration
emailTransporter.verify(function(error, success) {
  if (error) {
    console.error('[CommService] Email transporter verification failed:', error);
  } else {
    console.log('[CommService] Email transporter is ready to send messages');
  }
});

/**
 * Sends an actual email using nodemailer
 */
export const sendActualEmail = async (
  to: string,
  subject: string,
  body: string,
  from: string = process.env.EMAIL_USER || '',
  parentEmailId?: string
): Promise<boolean> => {
  try {
    console.log('[CommService] Email configuration:', {
      user: process.env.EMAIL_USER,
      hasPassword: !!process.env.EMAIL_APP_PASSWORD,
      from,
      to,
      subject
    });
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      throw new Error('Email configuration is missing. Please check your .env file.');
    }

    // Generate a unique message ID
    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${process.env.EMAIL_USER}>`;

    // If this is a reply, get the parent email's message ID
    let inReplyTo: string | undefined;
    let references: string[] = [];
    
    if (parentEmailId) {
      const parentResult = await query(
        'SELECT email_message_id, email_references FROM communication_records WHERE id = $1',
        [parentEmailId]
      );
      
      if (parentResult.rows.length > 0) {
        const parent = parentResult.rows[0];
        inReplyTo = parent.email_message_id;
        references = [...(parent.email_references || []), parent.email_message_id];
      }
    }

    // Format the email body with proper HTML and line breaks
    const formattedBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        ${body.split('\n\n').map(paragraph => {
          if (paragraph.trim() === '') {
            return '<br>';
          }
          return `<p style="margin: 0 0 1em 0;">${paragraph.split('\n').join('<br>')}</p>`;
        }).join('')}
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: formattedBody, // Use the formatted HTML body
      messageId,
      inReplyTo,
      references: references.length > 0 ? references : undefined,
      headers: {
        'X-CRM-Reference': parentEmailId || messageId
      }
    };

    console.log('[CommService] Attempting to send email with options:', {
      ...mailOptions,
      html: formattedBody.substring(0, 100) + '...' // Log only first 100 chars of body
    });

    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`[CommService] Email sent successfully: ${info.messageId}`);

    // Update the communication record with message ID and references
    if (parentEmailId) {
      await query(
        `UPDATE communication_records 
         SET email_message_id = $1, 
             email_in_reply_to = $2, 
             email_references = $3,
             is_reply = true
         WHERE id = $4`,
        [messageId, inReplyTo, references, parentEmailId]
      );
    }

    return true;
  } catch (error) {
    console.error('[CommService] Error sending email:', error);
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// --- Helper Function to Save Recording ---
const saveRecording = async (base64Data: string): Promise<string> => {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `${uuidv4()}.wav`; // Generate unique filename
    // Ensure the uploads directory exists (relative to dist/server/services)
    const uploadsDir = process.env.NODE_ENV === 'production'
      ? '/tmp/uploads/recordings'
      : path.join(__dirname, '../../../uploads/recordings'); 
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
 * Creates a new communication record (call, meeting, or remark) in the database.
 */
export const createCommunicationRecord = async (
  recordData: CreateCommunicationPayload, 
  creator: AuthUserInfo
): Promise<CommunicationRecord> => {
  try {
    console.log('[CommService] createCommunicationRecord received data:', JSON.stringify(recordData)); 
    console.log('[CommService] Creator:', creator);

    const { 
      type, notes, remark_text,
      lead_id, customer_id, duration, recording_data
    } = recordData;

    // Basic permission check
    if (!creator.permissions?.addCommunications) {
      throw new Error('Permission denied: Cannot add communication records.');
    }

    // Validate required fields for call type
    if (type === 'call') {
      if (!lead_id && !customer_id) {
        throw new Error('Either lead_id or customer_id is required for call type');
      }
    }

    const finalCreatedBy = creator.id;
    const recordingUrl: string | null = null;
    const finalRemarkText: string | null = type === 'remark' ? (remark_text || notes || null) : null;
    const finalNotes: string | null = type === 'remark' ? null : (notes || null);

    // Handle recording data if present
    if (recording_data) {
      try {
        const uploadsDir = path.join(process.cwd(), 'uploads', 'recordings');
        await fs.mkdir(uploadsDir, { recursive: true });
        
        const fileName = `${uuidv4()}.webm`;
        const filePath = path.join(uploadsDir, fileName);
        
        // Remove the data URL prefix if present
        const base64Data = recording_data.replace(/^data:audio\/webm;base64,/, '');
        await fs.writeFile(filePath, base64Data, 'base64');
        
        recordingUrl = `/uploads/recordings/${fileName}`;
      } catch (error) {
        console.error('[CommService] Error saving recording:', error);
        throw new Error('Failed to save recording');
      }
    }

    // Build the SQL query
    const sqlQuery = `
      INSERT INTO communication_records (
        type, notes, lead_id, customer_id, duration, recording_url, made_by, date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;

    const params: QueryParamValue[] = [
      type,
      finalNotes,
      lead_id,
      customer_id,
      duration,
      recordingUrl,
      finalCreatedBy
    ];

    try {
      const result = await query(sqlQuery, params);
      if (result.rows.length === 0) {
        throw new Error('Failed to create communication record, no record returned.');
      }
      
      const record = result.rows[0];
      console.log('[CommService] Created record:', record);

      // Map remark_text back to notes if type is remark for consistent return type
      if (record.type === 'remark') {
        record.notes = record.remarkText;
      }
      
      console.log('[CommService] Successfully created communication record:', record);
      return record as CommunicationRecord;
    } catch (dbError) {
      console.error('[CommService] Database error:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('[CommService] Error in createCommunicationRecord:', error);
    throw error;
  }
};

/**
 * Gets communication history for a specific entity (lead or customer).
 */
export const getCommunicationHistoryForEntity = async (
  entityId: string | number,
  entityType: 'lead' | 'customer',
  user: AuthUserInfo
): Promise<CommunicationRecord[]> => {
  try {
    const viewScope = user.permissions?.viewCommunications || 'none';
    console.log(`[CommService] getCommunicationHistoryForEntity - User: ${user.id}, Role: ${user.role}, Scope: ${viewScope}`);

    let sqlQuery = `
      SELECT 
        id,
        type,
        notes,
        lead_id as "leadId",
        customer_id as "customerId",
        duration,
        recording_url as "recordingUrl",
        made_by as "createdBy",
        date,
        remark_text as "remarkText"
      FROM communication_records
      WHERE ${entityType}_id = $1
    `;
    
    const params: QueryParamValue[] = [entityId];

    // Add user filtering based on role and permissions
    if (user.role !== 'developer') {
      if (viewScope === 'created') {
        sqlQuery += ` AND made_by = $2`;
        params.push(user.id);
      } else if (viewScope === 'assignedContacts') {
        sqlQuery += ` AND (
          lead_id IN (SELECT id FROM leads WHERE assigned_to = $2)
          OR customer_id IN (SELECT id FROM customers WHERE assigned_to = $2)
        )`;
        params.push(user.id);
      }
    }

    sqlQuery += ` ORDER BY date DESC`;

    console.log("[CommService] Executing query:", sqlQuery);
    console.log("[CommService] Query params:", params);

    const result = await query(sqlQuery, params);
    
    if (!result || !result.rows) {
      console.error('[CommService] Invalid query result:', result);
      throw new Error('Database query returned invalid result');
    }
    
    const records = result.rows.map(row => ({
      ...row,
      date: row.date ? new Date(row.date) : undefined
    })) as CommunicationRecord[];
    
    console.log(`[CommService] Successfully fetched ${records.length} records`);
    return records;
  } catch (error) {
    console.error('[CommService] Error in getCommunicationHistoryForEntity:', error);
    throw error;
  }
};

/**
 * Gets all communication history (respecting user permissions).
 */
export const getAllCommunicationHistory = async (user: AuthUserInfo): Promise<CommunicationRecord[]> => {
  try {
    const viewScope = user.permissions?.viewCommunications || 'none';
    console.log(`[CommService] getAllCommunicationHistory - User: ${user.id}, Role: ${user.role}, Scope: ${viewScope}`);

    let sqlQuery = `
      SELECT 
        id,
        type,
        notes,
        lead_id as "leadId",
        customer_id as "customerId",
        duration,
        recording_url as "recordingUrl",
        made_by as "createdBy",
        date,
        remark_text as "remarkText"
      FROM communication_records
    `;
    
    const params: QueryParamValue[] = [];

    // Add user filtering based on role and permissions
    if (user.role !== 'developer') {
      if (viewScope === 'created') {
        sqlQuery += ` WHERE made_by = $1`;
        params.push(user.id);
      } else if (viewScope === 'assignedContacts') {
        sqlQuery += ` WHERE (
          lead_id IN (SELECT id FROM leads WHERE assigned_to = $1)
          OR customer_id IN (SELECT id FROM customers WHERE assigned_to = $1)
        )`;
        params.push(user.id);
      }
    }

    sqlQuery += ` ORDER BY date DESC`;

    console.log("[CommService] Executing query:", sqlQuery);
    console.log("[CommService] Query params:", params);

    const result = await query(sqlQuery, params);
    
    if (!result || !result.rows) {
      console.error('[CommService] Invalid query result:', result);
      throw new Error('Database query returned invalid result');
    }
    
    const records = result.rows.map(row => ({
      ...row,
      date: row.date ? new Date(row.date) : undefined
    })) as CommunicationRecord[];
    
    console.log(`[CommService] Successfully fetched ${records.length} records`);
    return records;
  } catch (error) {
    console.error('[CommService] Error in getAllCommunicationHistory:', error);
    throw error;
  }
};

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

/**
 * Retries sending failed emails
 */
export const retryFailedEmails = async (): Promise<void> => {
  try {
    // Get failed emails
    const result = await query(`
      SELECT id, email_subject, email_body, lead_id, customer_id 
      FROM communication_records 
      WHERE type = 'email' AND email_sent = FALSE
    `);
    
    for (const record of result.rows) {
      try {
        let recipientEmail = '';
        
        if (record.lead_id) {
          const leadResult = await query('SELECT email FROM leads WHERE id = $1', [record.lead_id]);
          if (leadResult.rows.length > 0) {
            recipientEmail = leadResult.rows[0].email;
          }
        } else if (record.customer_id) {
          const customerResult = await query('SELECT email FROM customers WHERE id = $1', [record.customer_id]);
          if (customerResult.rows.length > 0) {
            recipientEmail = customerResult.rows[0].email;
          }
        }
        
        if (recipientEmail) {
          await sendActualEmail(recipientEmail, record.email_subject, record.email_body);
          
          // Update status
          await query('UPDATE communication_records SET email_sent = TRUE WHERE id = $1', [record.id]);
          console.log(`[CommService] Successfully retried email ID: ${record.id}`);
        }
      } catch (error) {
        console.error(`[CommService] Failed to retry email ID: ${record.id}`, error);
      }
    }
  } catch (error) {
    console.error('[CommService] Error in retryFailedEmails:', error);
  }
};