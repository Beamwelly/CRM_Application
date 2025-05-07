import { 
  Lead, 
  Customer, 
  User, 
  ServiceType, 
  TrainingLeadStatus, 
  WealthLeadStatus,
  TrainingCustomerStatus,
  WealthCustomerStatus,
  RenewalStatus,
  PaymentType,
  CommunicationRecord,
  // Import permission types and defaults
  UserPermissions,
  DEFAULT_DEVELOPER_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS
} from '@/types';
import { addDays, addMonths, subDays, subMonths } from 'date-fns';

// Create users with updated roles and permissions
export const users: User[] = [
  {
    id: "1",
    name: "Dev User",
    email: "dev@example.com",
    role: "developer", // Correct role
    permissions: DEFAULT_DEVELOPER_PERMISSIONS, // Added permissions
    createdAt: new Date("2023-05-10"),
    createdByAdminId: null,
    employeeCreationLimit: null,
  },
  {
    id: "2",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin", // Correct role
    permissions: DEFAULT_ADMIN_PERMISSIONS, // Added permissions
    employeeCreationLimit: 10, // Example limit
    createdAt: new Date("2023-05-15"),
    createdByAdminId: null,
  },
  {
    id: "3",
    name: "Employee User (Training)",
    email: "employee-train@example.com",
    role: "employee", // Correct role
    permissions: DEFAULT_EMPLOYEE_PERMISSIONS, // Use default or specific
    createdByAdminId: "2", // Linked to Admin User (ID 2)
    createdAt: new Date("2023-06-01"),
    employeeCreationLimit: null,
    // serviceTypeAccess: ["training"], // Can remove if permissions handle it
  },
  {
    id: "4",
    name: "Employee User (Wealth)",
    email: "employee-wealth@example.com",
    role: "employee", // Correct role
    permissions: DEFAULT_EMPLOYEE_PERMISSIONS, // Use default or specific
    createdByAdminId: "2", // Linked to Admin User (ID 2)
    createdAt: new Date("2023-06-15"),
    employeeCreationLimit: null,
    // serviceTypeAccess: ["wealth"], // Can remove if permissions handle it
  }
];

// Helper to create a follow-up
const createFollowUp = (index: number, isLead: boolean = true, userId: string = '2') => {
  const today = new Date();
  let callDate: Date;
  
  // Distribute follow-ups: some in past, some today, some in future
  if (index % 3 === 0) {
    callDate = subDays(today, Math.floor(Math.random() * 5) + 1); // 1-5 days ago
  } else if (index % 3 === 1) {
    callDate = new Date(); // Today
  } else {
    callDate = addDays(today, Math.floor(Math.random() * 7) + 1); // 1-7 days in future
  }
  
  return {
    id: `followup-${index}`,
    date: subDays(today, Math.floor(Math.random() * 10) + 1), // Created 1-10 days ago
    nextCallDate: callDate,
    notes: isLead 
      ? `Follow up about ${Math.random() > 0.5 ? 'training program' : 'wealth management services'}`
      : `Check on customer satisfaction and discuss ${Math.random() > 0.5 ? 'renewal options' : 'additional services'}`,
    leadId: isLead ? `lead-${index}` : undefined,
    customerId: !isLead ? `customer-${index}` : undefined,
    createdBy: userId,
  };
};

// Create leads for each executive
const createLeadsForExecutive = (executiveId: string, startIndex: number): Lead[] => {
  return Array.from({ length: 5 }).map((_, i) => {
    const index = startIndex + i;
    const serviceType: ServiceType = i % 2 === 0 ? 'training' : 'wealth';
    let status: TrainingLeadStatus | WealthLeadStatus;
    
    if (serviceType === 'training') {
      const statuses: TrainingLeadStatus[] = [
        'new', 'not_connected', 'follow_up', 'ready_to_attend', 'attended'
      ];
      status = statuses[Math.floor(Math.random() * statuses.length)];
    } else {
      const statuses: WealthLeadStatus[] = [
        'new', 'not_connected', 'follow_up', 'interested', 'consultation_done'
      ];
      status = statuses[Math.floor(Math.random() * statuses.length)];
    }
    
    return {
      id: `lead-${index}`,
      name: `Lead ${index}`,
      email: `lead${index}@example.com`,
      mobile: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'][Math.floor(Math.random() * 5)],
      serviceType,
      status,
      assignedTo: executiveId,
      createdAt: subDays(new Date(), Math.floor(Math.random() * 30)),
      followUps: i % 3 === 0 ? [createFollowUp(index, true, executiveId)] : [],
      aum: serviceType === 'wealth' ? Math.floor(Math.random() * 10000000) + 1000000 : undefined,
      company: Math.random() > 0.5 ? `Company ${index}` : undefined,
      leadSource: Math.random() > 0.7 ? 'reference' : 'walk_in',
      referredBy: Math.random() > 0.7 ? `Existing Customer ${Math.floor(Math.random() * 10) + 1}` : undefined,
    };
  });
};

// Create customers for each executive
const createCustomersForExecutive = (executiveId: string, startIndex: number): Customer[] => {
  return Array.from({ length: 4 }).map((_, i) => {
    const index = startIndex + i;
    const serviceType: ServiceType = i % 2 === 0 ? 'training' : 'wealth';
    let status: TrainingCustomerStatus | WealthCustomerStatus;
    
    if (serviceType === 'training') {
      const statuses: TrainingCustomerStatus[] = [
        'email_sent', 'form_filled', 'payment_made', 'documents_submitted', 'classes_started', 'completed'
      ];
      status = statuses[Math.floor(Math.random() * statuses.length)];
    } else {
      const statuses: WealthCustomerStatus[] = [
        'email_sent', 'form_filled', 'documents_submitted', 'account_started', 'initial_investment', 'active'
      ];
      status = statuses[Math.floor(Math.random() * statuses.length)];
    }
    
    // Create start date (1-6 months ago)
    const startDate = subMonths(new Date(), Math.floor(Math.random() * 6) + 1);
    
    // Create next renewal date (0-12 months from now)
    const nextRenewal = addMonths(new Date(), Math.floor(Math.random() * 12));
    
    // Define renewal statuses
    const renewalStatuses: RenewalStatus[] = ['renewed', 'pending', 'expired', 'cancelled'];
    
    // Create renewal history
    const renewalHistory = [{
      date: startDate,
      amount: Math.floor(Math.random() * 50000) + 10000,
      status: 'renewed' as RenewalStatus,
      notes: 'Initial signup',
    }];
    
    // Add additional renewals for some customers
    if (i % 3 === 0) {
      const secondRenewalDate = addMonths(startDate, 12);
      if (secondRenewalDate < new Date()) {
        renewalHistory.push({
          date: secondRenewalDate,
          amount: Math.floor(Math.random() * 50000) + 10000,
          status: renewalStatuses[Math.floor(Math.random() * renewalStatuses.length)],
          notes: 'First renewal',
        });
      }
    }
    
    const paymentTypeOptions: PaymentType[] = ['full_payment', 'installment'];
    
    return {
      id: `customer-${index}`,
      leadId: i < 2 ? `lead-${index}` : undefined, // Some customers converted from leads
      name: `Customer ${index}`,
      email: `customer${index}@example.com`,
      mobile: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'][Math.floor(Math.random() * 5)],
      address: `Address ${index}, ${['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'][Math.floor(Math.random() * 5)]}`,
      serviceType,
      status,
      assignedTo: executiveId,
      startDate,
      nextRenewal,
      paymentType: paymentTypeOptions[Math.floor(Math.random() * paymentTypeOptions.length)],
      dob: new Date(1980 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      createdAt: startDate,
      followUps: i % 4 === 0 ? [createFollowUp(index + 100, false, executiveId)] : [],
      renewalHistory,
      engagementFlags: {
        welcomeEmail: Math.random() > 0.2,
        community: Math.random() > 0.5,
        calls: Math.random() > 0.3,
      },
      aum: serviceType === 'wealth' ? Math.floor(Math.random() * 10000000) + 1000000 : undefined,
    };
  });
};

// Generate leads for each executive
export const leads: Lead[] = [
  ...createLeadsForExecutive('2', 1),
  ...createLeadsForExecutive('3', 6),
  ...createLeadsForExecutive('4', 11),
  ...createLeadsForExecutive('5', 16)
];

// Generate customers for each executive
export const customers: Customer[] = [
  ...createCustomersForExecutive('2', 1),
  ...createCustomersForExecutive('3', 5),
  ...createCustomersForExecutive('4', 9),
  ...createCustomersForExecutive('5', 13)
];

const createCommunication = (index: number, type: 'call' | 'email', userId: string, entityType: 'lead' | 'customer', entityId: string | number): CommunicationRecord => {
  const record: Partial<CommunicationRecord> = { // Use Partial initially
    id: `comm-${entityType}-${entityId}-${index}`,
    type,
    date: subDays(new Date(), Math.floor(Math.random() * 15) + 1), // Use subDays like before
    notes: `Notes for ${type} ${index}`, // Use notes field
    createdBy: userId,
    [entityType === 'lead' ? 'leadId' : 'customerId']: entityId,
  };
  
  if (type === 'call') {
    record.duration = Math.floor(Math.random() * 300) + 30; // Use 'duration' field
    record.callStatus = ['completed', 'missed', 'cancelled'][Math.floor(Math.random() * 3)] as 'completed' | 'missed' | 'cancelled'; // Restore callStatus
    record.recordingUrl = Math.random() > 0.4 // Restore recordingUrl for dummy data
        ? 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' 
        : undefined;
    // Notes are already set above
  } else if (type === 'email') {
    record.emailSubject = `Subject for email ${index}`; // Restore emailSubject
    record.emailBody = `Body of email ${index} for ${entityType} ${entityId}. Lorem ipsum dolor sit amet.`; // Restore emailBody
  }
  
  // Assert as CommunicationRecord after assigning all required fields
  return record as CommunicationRecord; 
};
