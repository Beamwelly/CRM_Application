import { ServiceType } from "@/types";
import { parse } from "date-fns";
import { ParsedRow } from '../importHelpers';

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidDate = (date: string | Date | undefined): boolean => {
  if (!date) return false;
  
  if (typeof date === 'string') {
    // Check if the date matches DD-MM-YYYY format
    if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      try {
        const parsedDate = parse(date, 'dd-MM-yyyy', new Date());
        return !isNaN(parsedDate.getTime());
      } catch (error) {
        return false;
      }
    } else {
      // Try standard date parsing as fallback
      return !isNaN(new Date(date).getTime());
    }
  }
  
  return !isNaN(new Date(date).getTime());
};

export const isValidMobile = (mobile: string): boolean => {
  // Remove any non-digit characters
  const cleaned = mobile.replace(/\D/g, '');
  // Check if it's a valid length (10 digits for most countries)
  return /^\d{10,15}$/.test(cleaned);
};

export const validateLeadData = (data: ParsedRow[]): string[] => {
  const errors: string[] = [];
  
  if (data.length === 0) {
    errors.push("File contains no data.");
    return errors;
  }
  
  const requiredFields = ["name", "email", "mobile", "city", "serviceType"];
  const firstRow = data[0];
  
  const missingFields = requiredFields.filter(field => !Object.keys(firstRow).includes(field));
  if (missingFields.length > 0) {
    errors.push(`Missing required columns: ${missingFields.join(", ")}`);
  }
  
  const validServiceTypes = ["training", "wealth", "equity", "insurance", "mutual_funds", "pms", "aif", "others"];

  data.forEach((row, index) => {
    if (!row.name || !row.email || !row.mobile || !row.city || !row.serviceType) {
      errors.push(`Row ${index + 1}: Missing required data.`);
    }
    
    if (row.email && !isValidEmail(String(row.email))) {
      errors.push(`Row ${index + 1}: Invalid email format.`);
    }

    if (row.mobile && !isValidMobile(String(row.mobile))) {
      errors.push(`Row ${index + 1}: Invalid mobile number format. Must be 10-15 digits.`);
    }
    
    if (row.serviceType && !validServiceTypes.includes(String(row.serviceType))) {
      errors.push(`Row ${index + 1}: serviceType must be one of ${validServiceTypes.join(', ')}.`);
    }
  });
  
  return errors;
};

export const validateCustomerData = (data: ParsedRow[]): string[] => {
  const errors: string[] = [];
  
  if (data.length === 0) {
    errors.push("File contains no data.");
    return errors;
  }
  
  const requiredFields = ["name", "email", "mobile", "city", "serviceType", "startDate"];
  const firstRow = data[0];
  
  const missingFields = requiredFields.filter(field => !Object.keys(firstRow).includes(field));
  if (missingFields.length > 0) {
    errors.push(`Missing required columns: ${missingFields.join(", ")}`);
  }
  
  const validServiceTypes = ["training", "wealth", "equity", "insurance", "mutual_funds", "pms", "aif", "others"];

  data.forEach((row, index) => {
    if (!row.name || !row.email || !row.mobile || !row.city || !row.serviceType || !row.startDate) {
      errors.push(`Row ${index + 1}: Missing required data.`);
    }
    
    if (row.email && !isValidEmail(String(row.email))) {
      errors.push(`Row ${index + 1}: Invalid email format.`);
    }

    if (row.mobile && !isValidMobile(String(row.mobile))) {
      errors.push(`Row ${index + 1}: Invalid mobile number format. Must be 10-15 digits.`);
    }
    
    if (row.serviceType && !validServiceTypes.includes(String(row.serviceType))) {
      errors.push(`Row ${index + 1}: serviceType must be one of ${validServiceTypes.join(', ')}.`);
    }
    
    if (row.startDate && !isValidDate(row.startDate instanceof Date ? row.startDate : String(row.startDate))) {
      errors.push(`Row ${index + 1}: Invalid startDate format. Use DD-MM-YYYY format.`);
    }
  });
  
  return errors;
};
