import { query, QueryParamValue } from '../db';
import { v4 as uuidv4 } from 'uuid';

// Define types locally to avoid rootDir issues
type ServiceType = 'training' | 'wealth' | 'equity' | 'insurance' | 'mutual_funds' | 'pms' | 'aif' | 'others'; // Expanded types

// Minimal Lead type for bulk insert context
interface Lead {
  id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  city?: string;
  serviceType?: ServiceType;
  status?: string; 
  assignedTo?: string;
  aum?: number;
  company?: string;
  leadSource?: 'walk_in' | 'reference';
  referredBy?: string;
  lastWebinarDate?: Date;
  // Add other fields if used by prepare/validate functions implicitly
}

// Minimal Customer type for bulk insert context
interface Customer {
  id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  city?: string;
  serviceType?: ServiceType;
  status?: string;
  assignedTo?: string;
  startDate?: Date;
  nextRenewal?: Date;
  paymentType?: 'card' | 'bank_transfer' | 'cash' | 'full_payment' | 'installment';
  dob?: Date;
  address?: string;
  aum?: number;
  batchNo?: string;
  engagementFlags?: {
    welcomeEmail: boolean;
    community: boolean;
    calls: boolean;
  };
  // Add other fields if used by prepare/validate functions implicitly
}

interface AuthUserInfo {
  id: string;
  role: 'developer' | 'admin' | 'employee';
  // Add permissions if needed for granular checks within bulk insert
}

// Type for the data received from the frontend (already parsed/validated)
// This should match the structure produced by parseFile/prepareLeadData etc.
// and validated by validateLeadData/validateCustomerData.
type ParsedLeadData = Partial<Omit<Lead, 'id' | 'createdAt' | 'followUps' | 'communicationHistory'>>; // Allow partial for flexibility
type ParsedCustomerData = Partial<Omit<Customer, 'id' | 'createdAt' | 'followUps' | 'renewalHistory' | 'communicationHistory'>>; 

// Define a type for individual row errors
interface BulkInsertError {
    rowData: ParsedLeadData | ParsedCustomerData; // Or keep as any if structure varies wildly
    error: string;
}

interface BulkInsertResult {
    insertedCount: number;
    errors: BulkInsertError[]; // Use the specific type
}

/**
 * Performs a bulk insert of leads into the database within a transaction.
 * @param leadsData Array of lead data objects (parsed and validated).
 * @param creator User performing the bulk insert.
 * @returns Promise resolving to BulkInsertResult.
 */
export const bulkInsertLeads = async (
    leadsData: ParsedLeadData[],
    creator: AuthUserInfo
): Promise<BulkInsertResult> => {
    let insertedCount = 0;
    const errors: BulkInsertError[] = []; // Use the specific type

    try {
        await query('BEGIN', []);

        // Prepare the base insert statement
        const sqlQuery = `
            INSERT INTO leads (
              id, name, email, mobile, city, service_type, status, assigned_to, created_by,
              aum, company, lead_source, referred_by, last_webinar_date, created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
            )
            ON CONFLICT (email) DO NOTHING; -- Example: Skip duplicates based on email
        `;

        for (const lead of leadsData) {
            try {
                // Generate ID, set defaults, use creator ID
                const leadId = uuidv4();
                const createdById = creator.id;
                // Default assignee based on role (similar to single createLead)
                const assignedToId = lead.assignedTo || (creator.role === 'employee' ? creator.id : null);
                const status = lead.status || 'new';
                const serviceType = lead.serviceType || 'training'; // Ensure default

                // Basic check for required fields (already validated on frontend, but good practice)
                if (!lead.name || !lead.email || !lead.mobile || !lead.city) {
                    throw new Error('Missing required fields (name, email, mobile, city)');
                }

                const params: QueryParamValue[] = [
                    leadId,
                    lead.name,
                    lead.email,
                    lead.mobile,
                    lead.city,
                    serviceType,
                    status,
                    assignedToId,
                    createdById,
                    lead.aum,
                    lead.company,
                    lead.leadSource,
                    lead.referredBy,
                    lead.lastWebinarDate instanceof Date ? lead.lastWebinarDate : null,
                ];

                const result = await query(sqlQuery, params);
                if ((result.rowCount ?? 0) > 0) {
                   insertedCount++;
                }
            } catch (rowError) {
                console.error(`Error inserting lead row: ${JSON.stringify(lead)}`, rowError);
                errors.push({ rowData: lead, error: rowError instanceof Error ? rowError.message : String(rowError) });
                // Continue to next row even if one fails
            }
        }

        await query('COMMIT', []);
        console.log(`Bulk lead insert committed. Inserted: ${insertedCount}, Errors: ${errors.length}`);
    } catch (error) {
        try {
            await query('ROLLBACK', []);
        } catch (rollbackError) {
            console.error('Error rolling back transaction:', rollbackError);
        }
        console.error('Error during bulk lead insert transaction, rolled back:', error);
        // Re-throw the main transaction error
        throw new Error('Bulk lead insert failed.');
    }

    return { insertedCount, errors };
};

/**
 * Performs a bulk insert of customers into the database within a transaction.
 * @param customersData Array of customer data objects (parsed and validated).
 * @param creator User performing the bulk insert.
 * @returns Promise resolving to BulkInsertResult.
 */
export const bulkInsertCustomers = async (
    customersData: ParsedCustomerData[],
    creator: AuthUserInfo
): Promise<BulkInsertResult> => {
    let insertedCount = 0;
    const errors: BulkInsertError[] = []; // Use the specific type

    try {
        await query('BEGIN', []);

        // Prepare the base insert statement
        const sqlQuery = `
            INSERT INTO customers (
                id, name, email, mobile, city, service_type, status, assigned_to, created_by, 
                start_date, next_renewal, payment_type, dob, address, aum, batch_no,
                welcome_email, community_access, intro_call_completed, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                $17, $18, $19, NOW()
            )
            ON CONFLICT (email) DO NOTHING; -- Example: Skip duplicates based on email
        `;

        for (const customer of customersData) {
            try {
                // Generate ID, set defaults, use creator ID
                const customerId = uuidv4();
                const createdById = creator.id;
                const assignedToId = customer.assignedTo || creator.id; // Must have assignee
                const status = customer.status || 'active';
                const serviceType = customer.serviceType || 'training';
                const startDate = customer.startDate instanceof Date ? customer.startDate : new Date();
                // Ensure engagement flags have defaults
                const engagementFlags = customer.engagementFlags || { welcomeEmail: false, community: false, calls: false };

                // Basic check for required fields
                if (!customer.name || !customer.email || !customer.mobile || !customer.city) {
                     throw new Error('Missing required fields (name, email, mobile, city)');
                }

                const params: QueryParamValue[] = [
                    customerId,
                    customer.name,
                    customer.email,
                    customer.mobile,
                    customer.city,
                    serviceType,
                    status,
                    assignedToId,
                    createdById,
                    startDate,
                    customer.nextRenewal instanceof Date ? customer.nextRenewal : null,
                    customer.paymentType,
                    customer.dob instanceof Date ? customer.dob : null,
                    customer.address,
                    customer.aum,
                    customer.batchNo,
                    engagementFlags.welcomeEmail,
                    engagementFlags.community,
                    engagementFlags.calls,
                ];

                const result = await query(sqlQuery, params);
                if ((result.rowCount ?? 0) > 0) {
                    insertedCount++;
                }
            } catch (rowError) {
                console.error(`Error inserting customer row: ${JSON.stringify(customer)}`, rowError);
                errors.push({ rowData: customer, error: rowError instanceof Error ? rowError.message : String(rowError) });
            }
        }

        await query('COMMIT', []);
        console.log(`Bulk customer insert committed. Inserted: ${insertedCount}, Errors: ${errors.length}`);
    } catch (error) {
        try {
            await query('ROLLBACK', []);
        } catch (rollbackError) {
            console.error('Error rolling back transaction:', rollbackError);
        }
        console.error('Error during bulk customer insert transaction, rolled back:', error);
        throw new Error('Bulk customer insert failed.');
    }

    return { insertedCount, errors };
}; 