import { Lead, Customer, PaymentType } from '@/types';

// Add ConversionState interface with Record<string, never> to avoid linter warnings
export type ConversionState = Record<string, never>;

export interface ConversionActions {
  convertLeadToCustomer: (leadId: string | number) => Promise<Customer | null>;
}

export const useConversionSlice = (
  leads: Lead[],
  updateLeadInternal: (lead: Lead) => Promise<void>,
  addCustomerInternal: (customerData: Omit<Customer, 'id' | 'createdAt' | 'followUps' | 'renewalHistory'>) => Promise<Customer>
): ConversionActions => {
  
  const convertLeadToCustomer = async (leadId: string | number): Promise<Customer | null> => {
    console.log("TODO: Call backend API to convert lead", leadId);
    const lead = leads.find(l => l.id === leadId);
    
    if (!lead) {
        console.error("Lead not found for conversion:", leadId);
        return null;
    }
    
    const baseCustomerData: Omit<Customer, 'id' | 'createdAt' | 'followUps' | 'renewalHistory'> = {
      leadId,
      name: lead.name,
      mobile: lead.mobile,
      email: lead.email,
      city: lead.city,
      serviceTypes: lead.serviceTypes,
      aum: lead.aum,
      assignedTo: lead.assignedTo || undefined,
      startDate: new Date(),
      nextRenewal: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      paymentType: 'full_payment',
      engagementFlags: {
        welcomeEmail: false,
        community: false,
        calls: false,
      },
      status: lead.serviceTypes?.includes('training') 
        ? 'email_sent' 
        : 'email_sent',
    };

    try {
      const newCustomer = await addCustomerInternal(baseCustomerData);
      await updateLeadInternal({ 
        ...lead, 
        status: lead.serviceTypes?.includes('training') 
          ? 'attended'
          : 'consultation_done'
      });
      return newCustomer;
    } catch (error) {
        console.error("Error converting lead to customer:", error);
        return null;
    }
  };
  
  return {
    convertLeadToCustomer
  };
};
