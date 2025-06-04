import * as XLSX from 'xlsx';
import { Lead, Customer, ServiceType } from '@/types';
import { parse, format, addMonths } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export interface ParsedRow {
  [key: string]: string | number | Date | undefined;
}

export const parseFile = async (file: File): Promise<ParsedRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("Failed to read file."));
          return;
        }
        
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData as ParsedRow[]);
      } catch (error) {
        reject(new Error("Failed to parse Excel/CSV."));
      }
    };
    
    reader.onerror = () => reject(new Error("Error reading file."));
    reader.readAsBinaryString(file);
  });
};

// Parse date from DD-MM-YYYY format
const parseDateString = (dateString: string): Date => {
  try {
    // Check if the dateString matches the expected format
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      return parse(dateString, 'dd-MM-yyyy', new Date());
    } else {
      // Try to parse as ISO date or other common formats
      return new Date(dateString);
    }
  } catch (error) {
    console.error("Failed to parse date:", dateString);
    return new Date(); // Return current date as fallback
  }
};

export const prepareLeadData = (row: ParsedRow): Omit<Lead, 'createdAt' | 'followUps'> => {
  return {
    id: uuidv4(),
    name: String(row.name || ''),
    email: String(row.email || ''),
    mobile: String(row.mobile || ''),
    city: String(row.city || ''),
    serviceTypes: [(row.serviceType || 'training') as ServiceType],
    status: 'new',
    leadSource: row.leadSource as 'walk_in' | 'reference' || 'walk_in',
    referredBy: row.referredBy ? String(row.referredBy) : undefined,
    company: row.company ? String(row.company) : undefined,
    aum: row.aum ? Number(row.aum) : undefined,
    assignedTo: row.assignedTo ? String(row.assignedTo) : undefined
  };
};

export const prepareCustomerData = (row: ParsedRow): Omit<Customer, 'createdAt' | 'followUps'> => {
  const startDate = row.startDate ? parse(String(row.startDate), 'dd-MM-yyyy', new Date()) : new Date();
  
  return {
    id: uuidv4(),
    name: String(row.name || ''),
    email: String(row.email || ''),
    mobile: String(row.mobile || ''),
    city: String(row.city || ''),
    address: String(row.address || ''),
    serviceTypes: [(row.serviceType || 'training') as ServiceType],
    status: row.status as Customer['status'] || 'active',
    startDate,
    nextRenewal: addMonths(startDate, 12),
    paymentType: row.paymentType as Customer['paymentType'] || 'full_payment',
    dob: row.dob ? parse(String(row.dob), 'dd-MM-yyyy', new Date()) : undefined,
    batchNo: row.batchNo ? String(row.batchNo) : undefined,
    aum: row.aum ? Number(row.aum) : undefined,
    assignedTo: row.assignedTo ? String(row.assignedTo) : undefined,
    engagementFlags: {
      welcomeEmail: row.welcomeEmail === 'true',
      community: row.community === 'true',
      calls: row.calls === 'true'
    },
    renewalHistory: []
  };
};
