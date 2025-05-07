import { z } from 'zod';

// Service Type Enum (ensure this matches frontend src/types/index.ts)
export const ServiceTypeSchema = z.enum([
    'training', 
    'wealth', 
    'equity', 
    'insurance', 
    'mutual_funds', 
    'pms', 
    'aif', 
    'others'
]);

// Lead Status Enums (ensure these match frontend src/types/index.ts)
const TrainingLeadStatusSchema = z.enum([
    'new', 
    'not_connected', 
    'follow_up', 
    'ready_to_attend', 
    'attended'
]);
const WealthLeadStatusSchema = z.enum([
    'new', 
    'not_connected', 
    'follow_up', 
    'interested', 
    'consultation_done'
]);
// Combine lead statuses - adjust if other types have specific statuses
export const LeadStatusSchema = z.union([
    TrainingLeadStatusSchema,
    WealthLeadStatusSchema
    // Add other lead status enums here if they exist
]);

// Customer Status Enums (ensure these match frontend src/types/index.ts)
const TrainingCustomerStatusSchema = z.enum([
    'email_sent', 
    'form_filled', 
    'payment_made', 
    'documents_submitted', 
    'classes_started', 
    'completed'
]);
const WealthCustomerStatusSchema = z.enum([
    'email_sent', 
    'form_filled', 
    'documents_submitted', 
    'account_started', 
    'initial_investment', 
    'active'
]);
// Combine customer statuses - adjust if other types have specific statuses
export const CustomerStatusSchema = z.union([
    TrainingCustomerStatusSchema,
    WealthCustomerStatusSchema
    // Add other customer status enums here if they exist
]);

// Payment Type Enum (ensure this matches frontend src/types/index.ts)
export const PaymentTypeSchema = z.enum([
    'card', 
    'bank_transfer', 
    'cash', 
    'full_payment', 
    'installment'
]); 