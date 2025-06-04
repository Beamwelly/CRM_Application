import { User } from './index';
import { HistoryEntry } from '.'; // Assuming HistoryEntry is in index.ts

export type CommunicationType = 'call' | 'email' | 'meeting' | 'note' | 'remark';

export type CallStatus = 'completed' | 'missed' | 'cancelled';

export interface CommunicationHistory {
  id: string;
  type: CommunicationType;
  date: Date;
  leadId?: string | number;
  customerId?: string | number;
  notes?: string;
  madeBy: string; // User ID
  duration?: number; // For calls, in seconds
  callStatus?: CallStatus;
  recordingUrl?: string; // For calls with recordings
  emailSubject?: string; // For emails
  emailBody?: string; // For emails
}

export interface ExtendedCommunicationHistory extends HistoryEntry {
  entityName?: string;
  entityType: 'lead' | 'customer';
  madeByName?: string;
}
