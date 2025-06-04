import { FollowUp as BaseFollowUp } from "./index";

// Extend the FollowUp type with additional fields
export interface ExtendedFollowUp extends BaseFollowUp {
  leadName?: string;
  customerName?: string;
  entityType?: 'lead' | 'customer';
  entityId?: string | number;
}

// Update the getPendingFollowUps function to return ExtendedFollowUp[]
declare module '@/context/CRMContext' {
  interface CRMContextType {
    getPendingFollowUps: (userId?: string) => ExtendedFollowUp[];
  }
}

// Extend the base FollowUp type to include the new properties
declare module '@/types' {
  interface FollowUp {
    leadName?: string;
    customerName?: string;
    entityType?: 'lead' | 'customer';
    entityId?: string | number;
  }
}

export interface FollowUpUpdateData {
  nextCallDate?: string; // ISO Date string for input
  notes?: string;
  isCompleted?: boolean;
}
